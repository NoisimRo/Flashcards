import React, { useState, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, Flag } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import type { Card } from '../../types';

interface CardViewProps {
  card: Card;
  deckId: string;
  isOwner: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onFlag?: () => void;
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  deckId,
  isOwner,
  onEdit,
  onDelete,
  onFlag,
  className = '',
}) => {
  const [activeMenu, setActiveMenu] = useState(false);
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    const closeMenu = () => setActiveMenu(false);
    if (activeMenu) {
      document.addEventListener('click', closeMenu);
      return () => document.removeEventListener('click', closeMenu);
    }
  }, [activeMenu]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(!activeMenu);
  };

  const canEdit = isOwner || hasPermission('cards:update');
  const canDelete =
    isOwner || hasPermission('cards:delete') || hasPermission('admin:manage_content');

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-4 relative group hover:shadow-md transition-shadow ${className}`}
    >
      {/* Three-dot menu */}
      <div className="absolute top-3 right-3">
        <button
          onClick={toggleMenu}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical size={18} className="text-gray-600" />
        </button>

        {activeMenu && (
          <div
            className="absolute right-0 top-10 bg-white shadow-xl rounded-xl p-2 min-w-[180px] z-10 border border-gray-100 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {canEdit && onEdit && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onEdit();
                  setActiveMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 font-medium"
              >
                <Edit size={16} /> Modifică
              </button>
            )}

            {canDelete && onDelete && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDelete();
                  setActiveMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 font-medium"
              >
                <Trash2 size={16} /> Șterge
              </button>
            )}

            {onFlag && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onFlag();
                  setActiveMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg flex items-center gap-2 font-medium"
              >
                <Flag size={16} /> Raportează card
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="pr-8">
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1">FAȚĂ</p>
          <p className="text-gray-900 font-medium">{card.front}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">SPATE</p>
          <p className="text-gray-700">{card.back}</p>
        </div>

        {card.context && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">CONTEXT</p>
            <p className="text-sm text-gray-600">{card.context}</p>
          </div>
        )}

        {card.flagCount && card.flagCount > 0 && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
              <Flag size={12} />
              {card.flagCount} {card.flagCount === 1 ? 'raport' : 'rapoarte'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
