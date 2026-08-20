import React from "react";

export interface OnboardingActionButton {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
}

export interface OnboardingSlideProps {
  index: number;
  totalSlides: number;
  title: string;
  bodyText: string | React.ReactNode;
  icon?: React.ReactNode;
  primaryActionButton?: OnboardingActionButton;
  secondaryActionButton?: OnboardingActionButton;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  title,
  bodyText,
  icon,
  primaryActionButton,
  secondaryActionButton,
}) => {
  return (
    <div className="flex flex-col items-center text-center px-4 py-2 space-y-5 animate-in fade-in duration-200">
      {/* Icon / Visual Badge */}
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-editorial-border flex items-center justify-center text-editorial-primary shadow-xs">
          {icon}
        </div>
      )}

      {/* Center-aligned Serif Title */}
      <h2 className="font-serif text-2xl font-semibold text-editorial-text tracking-tight m-0 leading-snug max-w-md">
        {title}
      </h2>

      {/* Body Content */}
      <div className="text-xs md:text-sm text-editorial-muted leading-relaxed max-w-md space-y-2">
        {typeof bodyText === "string" ? <p className="m-0">{bodyText}</p> : bodyText}
      </div>

      {/* Action Buttons */}
      {(primaryActionButton || secondaryActionButton) && (
        <div className="flex items-center justify-center gap-3 pt-3 w-full max-w-xs">
          {secondaryActionButton && (
            <button
              type="button"
              onClick={secondaryActionButton.onClick}
              className="btn-ghost flex-1 py-2.5 text-xs font-medium cursor-pointer"
            >
              {secondaryActionButton.label}
            </button>
          )}

          {primaryActionButton && (
            <button
              type="button"
              onClick={primaryActionButton.onClick}
              className="btn-primary flex-1 py-2.5 text-xs font-semibold cursor-pointer shadow-xs"
            >
              {primaryActionButton.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
