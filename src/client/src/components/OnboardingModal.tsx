import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Scale, Sparkles, FileText, ShieldAlert } from "lucide-react";
import { OnboardingSlide } from "./OnboardingSlide";
import type { OnboardingSlideProps } from "./OnboardingSlide";
import { hasSeenOnboarding, markOnboardingSeen } from "../utils/cookies";
import { useFileUpload } from "../hooks/useFileUpload";

const TOTAL_SLIDES = 4;

interface OnboardingModalProps {
  forceOpen?: boolean;
  onCloseCallback?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  forceOpen = false,
  onCloseCallback,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { openModal: onOpenUpload } = useFileUpload();

  // Check cookie on initial mount or when forceOpen changes
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentSlide(0);
    } else {
      if (!hasSeenOnboarding()) {
        setIsOpen(true);
      }
    }
  }, [forceOpen]);

  // Listen for manual trigger events from UI
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setCurrentSlide(0);
    };
    window.addEventListener("open-onboarding", handleOpen);
    return () => window.removeEventListener("open-onboarding", handleOpen);
  }, []);

  const handleClose = useCallback(() => {
    markOnboardingSeen();
    setIsOpen(false);
    onCloseCallback?.();
  }, [onCloseCallback]);

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => {
      if (prev < TOTAL_SLIDES - 1) {
        return prev + 1;
      }
      handleClose();
      return prev;
    });
  }, [handleClose]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleClose]);

  if (!isOpen) return null;

  const slidesData: Omit<OnboardingSlideProps, "index" | "totalSlides">[] = [
    {
      title: "Welcome to Paralegal",
      icon: <Scale className="w-7 h-7 text-editorial-primary" />,
      bodyText:
        "An intelligent legal audit platform engineered to extract insights and analyze risk across large document sets. Ask natural-language questions and receive answers strictly grounded in your case files.",
      secondaryActionButton: {
        label: "Skip",
        onClick: handleClose,
      },
      primaryActionButton: {
        label: "Next",
        onClick: handleNext,
      },
    },
    {
      title: "Self-Correcting Intelligence",
      icon: <Sparkles className="w-7 h-7 text-editorial-primary" />,
      bodyText:
        "Unlike standard AI tools that hallucinate, Paralegal actively maintains citation integrity. Granular feedback dynamically penalizes flawed chunks and applies query-time hot-patches to prevent recurring mistakes.",
      secondaryActionButton: {
        label: "Back",
        onClick: handlePrev,
      },
      primaryActionButton: {
        label: "Next",
        onClick: handleNext,
      },
    },
    {
      title: "Demo Notes & Guidelines",
      icon: <ShieldAlert className="w-7 h-7 text-amber-600" />,
      bodyText: (
        <div className="text-left space-y-2.5 text-xs text-editorial-muted leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-stone-700 font-semibold flex-shrink-0">•</span>
            <p className="m-0">
              <strong className="text-editorial-text font-medium">Hosted on AWS Spot:</strong> The platform runs on an EC2 Spot instance to minimize costs, so brief intermittent restarts may occasionally occur.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-stone-700 font-semibold flex-shrink-0">•</span>
            <p className="m-0">
              <strong className="text-editorial-text font-medium">Shared Workspace:</strong> All visitors share the default demo persona (<code className="text-[11px] bg-stone-200/70 text-stone-800 px-1 py-0.5 rounded font-mono">lawyer_alice</code>). <em>Please do not upload real confidential or sensitive documents.</em>
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-stone-700 font-semibold flex-shrink-0">•</span>
            <p className="m-0">
              <strong className="text-editorial-text font-medium">Fair-Use Limit:</strong> A global quota of 100 AI queries per day is maintained across all visitors to prevent abuse.
            </p>
          </div>
        </div>
      ),
      secondaryActionButton: {
        label: "Back",
        onClick: handlePrev,
      },
      primaryActionButton: {
        label: "Next",
        onClick: handleNext,
      },
    },
    {
      title: "Ready for Your Consultation",
      icon: <FileText className="w-7 h-7 text-editorial-primary" />,
      bodyText:
        "Upload a sample PDF contract or agreement to start auditing clauses and liabilities, or type your legal question directly into the chat.",
      secondaryActionButton: {
        label: "Upload PDF",
        onClick: () => {
          handleClose();
          onOpenUpload();
        },
      },
      primaryActionButton: {
        label: "Explore Paralegal",
        onClick: handleClose,
      },
    },
  ];

  const currentData = slidesData[currentSlide] ?? slidesData[0]!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="card-editorial max-w-lg w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col justify-between min-h-[420px]">
        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-editorial-faint hover:text-editorial-text transition-colors p-1.5 rounded-lg cursor-pointer z-20"
          title="Close guide"
          aria-label="Close onboarding guide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Carousel Navigation Arrows */}
        {currentSlide > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-editorial-faint hover:text-editorial-text hover:bg-editorial-sidebar transition-colors cursor-pointer z-20"
            title="Previous slide"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {currentSlide < TOTAL_SLIDES - 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-editorial-faint hover:text-editorial-text hover:bg-editorial-sidebar transition-colors cursor-pointer z-20"
            title="Next slide"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Slide Content Template */}
        <div className="flex-1 flex items-center justify-center py-4">
          <OnboardingSlide
            index={currentSlide}
            totalSlides={TOTAL_SLIDES}
            title={currentData.title}
            icon={currentData.icon}
            bodyText={currentData.bodyText}
            primaryActionButton={currentData.primaryActionButton}
            secondaryActionButton={currentData.secondaryActionButton}
          />
        </div>

        {/* Bottom Pagination Dots */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-editorial-border">
          {slidesData.map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                i === currentSlide ? "w-6 bg-editorial-primary" : "w-2 bg-stone-300 hover:bg-stone-400"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
