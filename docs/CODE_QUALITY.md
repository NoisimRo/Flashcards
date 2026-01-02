# Code Quality Guidelines

## Evitarea Warning-urilor ESLint

### 1. **NU folosi tipul `any`**

❌ **Greșit:**
```typescript
function processData(data: any) {
  return data.map((item: any) => item.name);
}
```

✅ **Corect:**
```typescript
interface DataItem {
  name: string;
  id: number;
}

function processData(data: DataItem[]) {
  return data.map(item => item.name);
}
```

### 2. **Numele variabilelor nefolosite**

❌ **Greșit:**
```typescript
function handleError(error: Error, context: string) {
  console.error(error);
  // 'context' is not used - WARNING!
}
```

✅ **Corect - Opțiunea 1 (folosește variabila):**
```typescript
function handleError(error: Error, context: string) {
  console.error(`Error in ${context}:`, error);
}
```

✅ **Corect - Opțiunea 2 (prefix cu underscore):**
```typescript
function handleError(error: Error, _context: string) {
  console.error(error);
}
```

### 3. **console.log în producție**

❌ **Greșit:**
```typescript
try {
  await saveData();
  console.log('Data saved'); // WARNING!
} catch (err) {
  console.log('Error:', err); // WARNING!
}
```

✅ **Corect:**
```typescript
try {
  await saveData();
  // Use console.warn or console.error - these are allowed
} catch (error) {
  console.error('Error saving data:', error);
}
```

### 4. **React Hook dependencies**

❌ **Greșit:**
```typescript
useEffect(() => {
  fetchData(userId);
}, []); // WARNING: 'userId' is missing in dependency array
```

✅ **Corect:**
```typescript
useEffect(() => {
  fetchData(userId);
}, [userId]); // Include all dependencies
```

### 5. **Error handling - nume variabile**

❌ **Greșit:**
```typescript
try {
  await operation();
} catch (err) {
  alert('Error'); // 'err' defined but never used - WARNING!
}
```

✅ **Corect:**
```typescript
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error);
  alert('Error occurred');
}
```

## Comenzi pentru Verificare Cod

### Înainte de commit:

```bash
# Verifică formatarea
npm run format:check

# Repară formatarea automată
npm run format

# Verifică ESLint warnings
npm run lint

# Rulează testele
npm test
```

### Setup automatic (pre-commit hook):

Instalează `husky` pentru hook-uri automate:

```bash
npm install --save-dev husky
npx husky install
npx husky add .git/hooks/pre-commit "npm run format:check && npm run lint"
```

## Best Practices

### Type Safety

1. **Definește interfețe pentru toate obiectele complexe**
2. **Folosește type guards pentru validare runtime**
3. **Evită type assertions (`as`) când e posibil**

### Error Handling

1. **Întotdeauna log-uiește erorile cu `console.error`**
2. **Include context în mesajele de eroare**
3. **Nu ascunde erorile - log them!**

### React Hooks

1. **Includeți toate dependențele în array-ul de deps**
2. **Folosiți `useCallback` pentru funcții pasate ca props**
3. **Evitați efecte cu multe dependențe - split them**

## Testing

### Reguli pentru teste:

1. **Fiecare funcție nouă trebuie să aibă teste**
2. **Coverage minim: 80%**
3. **Testează edge cases:**
   - Valori null/undefined
   - Array-uri goale
   - String-uri goale
   - Numere negative
   - Numere foarte mari

### Exemplu test complet:

```typescript
describe('calculateDiscount', () => {
  it('should calculate 10% discount', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
  });

  it('should handle 0% discount', () => {
    expect(calculateDiscount(100, 0)).toBe(100);
  });

  it('should handle 100% discount', () => {
    expect(calculateDiscount(100, 100)).toBe(0);
  });

  it('should throw on negative price', () => {
    expect(() => calculateDiscount(-100, 10)).toThrow();
  });

  it('should throw on invalid discount percentage', () => {
    expect(() => calculateDiscount(100, 150)).toThrow();
  });
});
```

## CI/CD Requirements

### Toate PR-urile trebuie să treacă:

- ✅ Prettier format check
- ✅ ESLint (0 errors, < 10 warnings)
- ✅ TypeScript compilation
- ✅ All tests passing
- ✅ Code coverage > 80%

### Configurare locală recomandată:

**VS Code settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

## Resurse

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
