import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const UserIcon = () => (
  <svg
    className="w-4 h-4 text-gray-500 flex-shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const AiIcon = () => (
  <svg
    className="w-4 h-4 text-blue-500 flex-shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 8V4H8"></path>
    <rect x="4" y="12" width="16" height="8" rx="2"></rect>
    <path d="M4 12v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <path d="M12 12v-2"></path>
  </svg>
);

const FeedbackItem = ({ type, time, comment, userPrompt, modelResponse }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreButton, setShowMoreButton] = useState(false);

  const promptRef = useRef(null);
  const responseRef = useRef(null);
  const commentRef = useRef(null);

  const typeStyles = {
    positive: {
      borderColor: "border-green-500",
      tagBg: "bg-green-100",
      tagText: "text-green-800",
    },
    negative: {
      borderColor: "border-red-500",
      tagBg: "bg-red-100",
      tagText: "text-red-800",
    },
  };
  const styles = typeStyles[type] || {};

  useEffect(() => {
    const isOverflowing = (el) => el && el.scrollHeight > el.clientHeight;
    if (
      isOverflowing(promptRef.current) ||
      isOverflowing(responseRef.current) ||
      isOverflowing(commentRef.current)
    ) {
      setShowMoreButton(true);
    }
  }, [userPrompt, modelResponse, comment]);

  return (
    <div
      className={`border-l-4 ${styles.borderColor} p-4 bg-white shadow-sm rounded-r-lg`}
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">
              Chat yang Direferensikan
            </h4>
            <span className="text-xs text-gray-500">{time}</span>
          </div>

          <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-2">
              <UserIcon />
              <p
                ref={promptRef}
                className={`text-sm text-gray-800 dark:text-gray-200 ${
                  !isExpanded ? "line-clamp-2" : ""
                }`}
              >
                {userPrompt}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AiIcon />
              <div 
                ref={responseRef} 
              className={`prose prose-sm max-w-none dark:prose-invert w-full overflow-x-auto ${!isExpanded ? 'line-clamp-2' : ''}`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {modelResponse}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {comment && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Komentar Feedback
            </h4>
            <p
              ref={commentRef}
              className={`text-sm text-gray-600 dark:text-gray-400 italic ${
                !isExpanded ? "line-clamp-2" : ""
              }`}
            >
              "{comment}"
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span
          className={`text-xs ${styles.tagBg} ${styles.tagText} px-2 py-1 rounded font-medium capitalize`}
        >
          {type}
        </span>

        {showMoreButton && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? "Sembunyikan" : "Lihat Selengkapnya"}
          </button>
        )}
      </div>
    </div>
  );
};

export default FeedbackItem;
