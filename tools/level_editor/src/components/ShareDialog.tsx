// sharing the open level on mod.io: signing in, whether it's online already,
// and uploading it
import type { LevelInfo } from "../api";
import { useLevelUpload } from "../hooks/useLevelUpload";
import { useModioAccount } from "../hooks/useModioAccount";
import {
  onlineText,
  showsUpAsText,
  uploadButtonText,
  uploadedText,
} from "../levelSharing";
import "./ShareDialog.css";

export default function ShareDialog({ level, title, save, onClose }: {
  level: LevelInfo;
  title: string; // level.cfg's title as it's edited, or "" for its folder's name
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

  // whether the level's online already
  const renderOnlineLine = () => {
    const { online } = levelUpload;
    if (online === undefined) {
      return <p>Checking whether it's online...</p>;
    }
    return <p>{onlineText(online !== null)}</p>;
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
      <p>{showsUpAsText(title, level.name)}</p>
      {renderOnlineLine()}
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
        aria-label="Share level"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Share {level.name}</h2>
        {renderShareContent()}
        {modio.problem && <p className="error">{modio.problem}</p>}
        {renderShareFooter()}
      </section>
    </div>
  );
}
