import React from "react";

const Loading = ({ full = false }: { full?: boolean }) => {
  return (
    <div className={`loader-wrapper ${full && "fullscreen"}`}>
      <div className="loader"></div>
    </div>
  );
};

export default Loading;
