import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: React.ReactNode;
  onBack?: () => void;
  backTitle?: string;
  leftExtra?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  onBack,
  backTitle = 'Back',
  leftExtra,
  actions
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 font-sans">
      <div className="flex items-center gap-2.5 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1 text-neutral-500 hover:text-neutral-900 cursor-pointer shrink-0"
            title={backTitle}
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h1 className="text-[20px] font-semibold text-neutral-900 truncate">{title}</h1>
        {leftExtra}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
