import { useState } from "react";

export default function UserAvatar({ user }) {
  const [failedPicture, setFailedPicture] = useState(null);
  const name = user?.name || user?.username || "Pengguna";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span className="user-avatar" aria-hidden="true">
      {user?.picture && user.picture !== failedPicture ? (
        <img
          src={user.picture}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedPicture(user.picture)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
