"use client";

export default function VideoModal({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <video
        src={src}
        autoPlay
        controls
        className="max-w-[90vw] max-h-[90vh] rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
