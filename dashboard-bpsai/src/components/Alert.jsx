export const Alert = ({ message, type }) => {
  const baseClasses = "p-4 mb-4 text-sm rounded-lg";
  const typeClasses = {
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };
  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      {message}
    </div>
  );
};