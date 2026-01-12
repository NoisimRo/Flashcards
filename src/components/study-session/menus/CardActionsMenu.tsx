import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, Flag } from 'lucide-react';
import { FlagModal } from '../../flags/FlagModal';
import { Card } from '../../../types/models';

interface CardActionsMenuProps {
  card: Card;
  canEditDelete?: boolean; // Permission to edit/delete (owners/teachers)
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * CardActionsMenu - Dropdown menu for card actions
 * Shows Edit/Delete/Flag options based on permissions
 */
export const CardActionsMenu: React.FC<CardActionsMenuProps> = ({
  card,
  canEditDelete = false,
  onEdit,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEdit = () => {
    setIsOpen(false);
    onEdit?.();
  };

  const handleDelete = () => {
    setIsOpen(false);
    if (window.confirm('Sigur vrei să ștergi acest card? Acțiunea nu poate fi anulată.')) {
      onDelete?.();
    }
  };

  const handleFlag = () => {
    setIsOpen(false);
    setShowFlagModal(true);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Menu Button */}
        <button
          onClick={e => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Acțiuni card"
        >
          <MoreVertical size={20} className="text-gray-600" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
            {/* Edit Option (only for owners/teachers) */}
            {canEditDelete && onEdit && (
              <button
                onClick={handleEdit}
                className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                <Edit size={18} />
                Editează
              </button>
            )}

            {/* Delete Option (only for owners/teachers) */}
            {canEditDelete && onDelete && (
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600 font-medium"
              >
                <Trash2 size={18} />
                Șterge
              </button>
            )}

            {/* Divider if both edit/delete and flag are shown */}
            {canEditDelete && (onEdit || onDelete) && (
              <div className="my-1 h-px bg-gray-200"></div>
            )}

            {/* Flag Option (available to all) */}
            <button
              onClick={handleFlag}
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-orange-50 transition-colors text-orange-600 font-medium"
            >
              <Flag size={18} />
              Raportează
            </button>
          </div>
        )}
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <FlagModal
          type="card"
          itemId={card.id}
          itemTitle={card.front}
          card={card}
          onClose={() => setShowFlagModal(false)}
          onSuccess={() => {
            setShowFlagModal(false);
          }}
        />
      )}
    </>
  );
};
