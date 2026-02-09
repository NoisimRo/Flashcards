import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { config } from '../config/index.js';

const router = Router();

interface BugReportBody {
  title: string;
  description: string;
  metadata: {
    url: string;
    userAgent: string;
    userName: string;
    userEmail: string;
    userRole: string;
    userLevel: number;
  };
  screenshot?: string; // base64 data (without data:image/png;base64, prefix)
}

/**
 * Upload a screenshot to the GitHub repo and return its raw URL.
 * Returns null if upload fails or no screenshot provided.
 */
async function uploadScreenshot(
  base64Data: string,
  repo: string,
  token: string
): Promise<string | null> {
  try {
    // Strip the data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

    const filename = `screenshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const path = `.bug-reports/screenshots/${filename}`;

    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `bug-report: add screenshot ${filename}`,
        content: cleanBase64,
      }),
    });

    if (!response.ok) {
      console.error('GitHub screenshot upload failed:', response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as { content?: { download_url?: string } };
    return data.content?.download_url || null;
  } catch (error) {
    console.error('Error uploading screenshot to GitHub:', error);
    return null;
  }
}

/**
 * Format the bug report as a GitHub Issue markdown body.
 */
function formatIssueBody(
  description: string,
  metadata: BugReportBody['metadata'],
  screenshotUrl: string | null
): string {
  const lines: string[] = [];

  lines.push('## Bug Report');
  lines.push('');
  lines.push('### Description');
  lines.push(description);
  lines.push('');

  if (screenshotUrl) {
    lines.push('### Screenshot');
    lines.push(`![Bug Screenshot](${screenshotUrl})`);
    lines.push('');
  }

  lines.push('### Environment');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push(`| **Page URL** | ${metadata.url} |`);
  lines.push(`| **User** | ${metadata.userName} (${metadata.userEmail}) |`);
  lines.push(`| **Role** | ${metadata.userRole} |`);
  lines.push(`| **Level** | ${metadata.userLevel} |`);
  lines.push(`| **Browser** | ${metadata.userAgent} |`);
  lines.push('');

  lines.push('---');
  lines.push('*This issue was automatically created via the in-app bug report system.*');

  return lines.join('\n');
}

// ============================================
// POST /api/feedback/bug - Submit a bug report
// ============================================
router.post('/bug', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { title, description, metadata, screenshot } = req.body as BugReportBody;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Titlul este obligatoriu',
        },
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Titlul nu poate depăși 200 de caractere',
        },
      });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Descrierea este obligatorie',
        },
      });
    }

    if (description.length > 5000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Descrierea nu poate depăși 5000 de caractere',
        },
      });
    }

    // Check GitHub configuration
    const { token, repo } = config.github;
    if (!token || !repo) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Sistemul de raportare nu este configurat. Contactați administratorul.',
        },
      });
    }

    // Upload screenshot if provided
    let screenshotUrl: string | null = null;
    if (screenshot) {
      screenshotUrl = await uploadScreenshot(screenshot, repo, token);
    }

    // Format issue body
    const body = formatIssueBody(description, metadata, screenshotUrl);

    // Create GitHub Issue
    const issueResponse = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[Bug Report] ${title}`,
        body,
        labels: ['bug'],
      }),
    });

    if (!issueResponse.ok) {
      const errorText = await issueResponse.text();
      console.error('GitHub issue creation failed:', issueResponse.status, errorText);
      return res.status(502).json({
        success: false,
        error: {
          code: 'GITHUB_ERROR',
          message: 'Nu s-a putut crea raportul pe GitHub. Încercați din nou.',
        },
      });
    }

    const issueData = (await issueResponse.json()) as { html_url: string; number: number };

    return res.status(201).json({
      success: true,
      data: {
        issueUrl: issueData.html_url,
        issueNumber: issueData.number,
      },
    });
  } catch (error) {
    console.error('Error creating bug report:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Eroare la crearea raportului de bug',
      },
    });
  }
});

export default router;
