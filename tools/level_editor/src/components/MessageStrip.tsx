import type { ActionStatus } from "../hooks/useLevelActions";
import { messageStrip, type Strip } from "../messageStrip";

interface MessageStripProps {
  error: string | null;
  status: ActionStatus | null;
  warnings: string[];
}

// an error strip is an alert; a warning strip is only news
const STRIP_LOOKS = {
  error: { className: "error error-strip", role: "alert" },
  warning: { className: "warning-strip", role: "status" },
};

const renderLines = (strip: Strip) =>
  strip.lines.map((line, index) => (
    <div key={index} title={line.detail}>{line.text}</div>
  ));

export default function MessageStrip({ error, status, warnings }: MessageStripProps) {
  const strip = messageStrip(error, status, warnings);
  if (!strip) {
    return null;
  }
  const { className, role } = STRIP_LOOKS[strip.kind];
  return <div className={className} role={role}>{renderLines(strip)}</div>;
}
