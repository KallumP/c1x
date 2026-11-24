// sharing the open level on mod.io: signing in, whether the map's online already,
// its summary and picture, and uploading it
import type { ReactNode } from "react";
import type { LevelInfo } from "../api";
import { useLevelUpload } from "../hooks/useLevelUpload";
import { useModioAccount } from "../hooks/useModioAccount";
import {
  onlineText,
  PICTURE_LABELS,
  pictureChoices,
  SUMMARY_MAX,
  uploadButtonText,
  uploadedText,
} from "../levelSharing";
import "./ShareDialog.css";

export default function ShareDialog({ level, save, onClose }: {
  level: LevelInfo;
  // saves the level first, as the upload zips its files; whether it saved
  save: () => Promise<boolean>;
  onClose: () => void;
}) {
  const modio = useModioAccount();
  const levelUpload = useLevelUpload(level, modio.signedIn, save, modio.returnToSignIn);

  const renderEmailStep = () => (
    <form onSubmit={(event) => { event.preventDefault(); modio.sendEmail(); }}>
      <p>Sign in to mod.io to share levels. It emails you a code to sign in with.</p>
      <input
        type="email"
        placeholder="Email"
        value={modio.email}
        onChange={(event) => modio.setEmail(event.target.value)}
        autoFocus
      />
      <button type="submit" disabled={modio.isBusy}>Email me a code</button>
    </form>
  );

  const renderCodeStep = () => (
    <form onSubmit={(event) => { event.preventDefault(); modio.sendCode(); }}>
      <p>mod.io emailed a code to {modio.email}.</p>
      <input
        placeholder="Code"
        value={modio.code}
        onChange={(event) => modio.setCode(event.target.value)}
        autoFocus
      />
      <button type="submit" disabled={modio.isBusy}>Sign in</button>
      <button type="button" disabled={modio.isBusy} onClick={modio.startAgain}>
        Use another email
      </button>
    </form>
  );

  const renderSignIn = () => {
    if (modio.step === "code") {
      return renderCodeStep();
    }
    return renderEmailStep();
  };

  // whether the map's online already
  const renderOnlineLine = () => {
    const { online } = levelUpload;
    if (online === undefined) {
      return <p>Checking whether it's online...</p>;
    }
    return <p>{onlineText(online !== null)}</p>;
  };

  // a new map's summary; a new version keeps its own
  const renderSummary = () => {
    if (levelUpload.online !== null) {
      return null;
    }
    return (
      <textarea
        placeholder="Summary: what players should know about it"
        rows={3}
        maxLength={SUMMARY_MAX}
        value={levelUpload.summary}
        onChange={(event) => levelUpload.setSummary(event.target.value)}
      />
    );
  };

  const renderShareSection = (title: string, content: ReactNode) => (
    <section className="share-section">
      <h3>{title}</h3>
      {content}
    </section>
  );

  // the picture the choice sends; none when it keeps its own
  const renderPicturePreview = () => {
    const shown = levelUpload.picture.chosen();
    if (!shown) {
      return null;
    }
    const source = `data:image/png;base64,${shown}`;
    return <img className="share-picture" src={source} alt="Its picture on mod.io" />;
  };

  const renderImagePicker = () => (
    <input
      type="file"
      accept="image/png, image/jpeg, image/gif, image/webp"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          levelUpload.chooseImage(file);
        }
      }}
    />
  );

  // where its picture on mod.io comes from, and what it'll be (cropped to 16:9)
  const renderPictureChoice = () => {
    const { online, picture } = levelUpload;
    if (online === undefined) {
      return null;
    }
    const choices = pictureChoices(Boolean(online)).map((choice) => (
      <label key={choice}>
        <input
          type="radio"
          checked={picture.choice === choice}
          onChange={() => picture.setChoice(choice)}
        />
        {PICTURE_LABELS[choice]}
      </label>
    ));
    return renderShareSection("Picture", (
      <>
        {choices}
        {picture.choice === "image" && renderImagePicker()}
        {renderPicturePreview()}
      </>
    ));
  };

  // why the last request failed, or that the upload worked
  const renderUploadResult = () => {
    const { uploaded, problem } = levelUpload;
    if (problem) {
      return <p className="error">{problem}</p>;
    }
    if (!uploaded) {
      return null;
    }
    return <p className="share-success">{uploadedText(uploaded)}</p>;
  };

  const renderUploadButton = () => {
    const { online, isBusy, upload } = levelUpload;
    if (isBusy) {
      return <button className="share-primary" disabled>Uploading...</button>;
    }
    return (
      <button className="share-primary" disabled={online === undefined} onClick={upload}>
        {uploadButtonText(Boolean(online))}
      </button>
    );
  };

  // that the player's signed in, under the title, with a way out
  const renderAccountLine = () => (
    <div className="share-account">
      <span>Signed in to mod.io</span>
      <button disabled={modio.isBusy} onClick={modio.signOut}>Sign out</button>
    </div>
  );

  const renderSignedIn = () => (
    <>
      {renderAccountLine()}
      {renderShareSection("Map", (
        <>
          {renderOnlineLine()}
          {renderSummary()}
        </>
      ))}
      {renderPictureChoice()}
      {renderUploadResult()}
    </>
  );

  const renderShareContent = () => {
    if (modio.signedIn === null) {
      return <p>Checking mod.io...</p>;
    }
    if (!modio.signedIn) {
      return renderSignIn();
    }
    return renderSignedIn();
  };

  const renderShareFooter = () => (
    <footer className="share-footer">
      <button onClick={onClose}>Close</button>
      {modio.signedIn && renderUploadButton()}
    </footer>
  );

  return (
    <div className="share-backdrop" onClick={onClose}>
      <section
        className="share-dialog"
        role="dialog"
        aria-label="Share on mod.io"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Share {level.name} on mod.io</h2>
        {renderShareContent()}
        {modio.problem && <p className="error">{modio.problem}</p>}
        {renderShareFooter()}
      </section>
    </div>
  );
}
