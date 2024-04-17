import clsx from 'clsx';
import React, { useCallback, useState } from 'react';

import { CloseIcon, DownloadIcon, LoadingIndicatorIcon, RetryIcon } from './icons';
import {
  isAudioAttachment,
  isMediaAttachment,
  isVoiceRecordingAttachment,
  PlayButton,
} from '../Attachment';
import { BaseImage as DefaultBaseImage } from '../Gallery';
import { useAudioController } from '../Attachment/hooks/useAudioController';
import { RecordingTimer } from '../MediaRecorder';
import { FileIcon } from '../ReactFileUtilities';
import { useComponentContext, useMessageInputContext } from '../../context';

import type { LocalAttachment } from './types';
import type { DefaultStreamChatGenerics } from '../../types';

export const AttachmentPreviewList = <
  StreamChatGenerics extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
>() => {
  const {
    attachments,
    fileOrder,
    imageOrder,
    removeAttachment,
    uploadAttachment,
  } = useMessageInputContext<StreamChatGenerics>('AttachmentPreviewList');

  return (
    <div className='str-chat__attachment-preview-list'>
      <div
        className='str-chat__attachment-list-scroll-container'
        data-testid='attachment-list-scroll-container'
      >
        {attachments.map((attachment) => {
          if (isVoiceRecordingAttachment(attachment)) {
            return (
              <VoiceRecordingPreview
                attachment={attachment}
                handleRetry={uploadAttachment}
                key={attachment.$internal?.id || attachment.asset_url}
                mimeType={attachment.mime_type}
                removeAttachment={removeAttachment}
              />
            );
          } else if (isAudioAttachment(attachment) || isMediaAttachment(attachment)) {
            // unnecessary to pass handleRetry as video and audio if among attachments is already uploaded
            // - user looking at the edit message input
            return (
              <FilePreview
                attachment={attachment}
                handleRetry={uploadAttachment}
                key={attachment.$internal?.id || attachment.asset_url}
                removeAttachment={removeAttachment}
              />
            );
          }
          return null;
        })}
        {imageOrder.map((id) => (
          <ImagePreviewItem id={id} key={id} />
        ))}
        {fileOrder.map((id) => (
          <FilePreviewItem id={id} key={id} />
        ))}
      </div>
    </div>
  );
};

type AttachmentPreviewProps<A extends LocalAttachment = LocalAttachment> = {
  attachment: A;
  removeAttachment: (id: string) => void;
  handleRetry?: (attachment: A) => void | Promise<A>;
  mimeType?: string;
};

const VoiceRecordingPreview = ({
  attachment,
  handleRetry,
  mimeType,
  removeAttachment,
}: AttachmentPreviewProps) => {
  const { audioRef, isPlaying, secondsElapsed, togglePlay } = useAudioController({ mimeType });

  return (
    <div
      className='str-chat__attachment-preview-voice-recording'
      data-testid='attachment-preview-voice-recording'
    >
      <audio ref={audioRef}>
        <source data-testid='audio-source' src={attachment.asset_url} type={attachment.mime_type} />
      </audio>
      <PlayButton isPlaying={isPlaying} onClick={togglePlay} />

      <button
        className='str-chat__attachment-preview-delete'
        data-testid='file-preview-item-delete-button'
        disabled={attachment.$internal?.uploadState === 'uploading'}
        onClick={() => attachment.$internal?.id && removeAttachment(attachment.$internal.id)}
      >
        <CloseIcon />
      </button>

      {attachment.$internal?.uploadState === 'failed' && !!handleRetry && (
        <button
          className='str-chat__attachment-preview-error str-chat__attachment-preview-error-file'
          data-testid='file-preview-item-retry-button'
          onClick={() => handleRetry(attachment)}
        >
          <RetryIcon />
        </button>
      )}

      <div className='str-chat__attachment-preview-metadata'>
        <div className='str-chat__attachment-preview-file-name' title={attachment.title}>
          {attachment.title}
        </div>
        {typeof attachment.duration !== 'undefined' && (
          <RecordingTimer durationSeconds={secondsElapsed || attachment.duration} />
        )}
        {attachment.$internal?.uploadState === 'uploading' && <LoadingIndicatorIcon size={17} />}
      </div>
      <div className='str-chat__attachment-preview-file-icon'>
        <FileIcon filename={attachment.title} mimeType={attachment.mime_type} version='2' />
      </div>
    </div>
  );
};

const FilePreview = ({ attachment, handleRetry, removeAttachment }: AttachmentPreviewProps) => (
  <div className='str-chat__attachment-preview-file' data-testid='attachment-preview-file'>
    <div className='str-chat__attachment-preview-file-icon'>
      <FileIcon filename={attachment.title} mimeType={attachment.mime_type} version='2' />
    </div>

    <button
      className='str-chat__attachment-preview-delete'
      data-testid='file-preview-item-delete-button'
      disabled={attachment.$internal?.uploadState === 'uploading'}
      onClick={() => attachment.$internal?.id && removeAttachment(attachment.$internal?.id)}
    >
      <CloseIcon />
    </button>

    {attachment.$internal?.uploadState === 'failed' && !!handleRetry && (
      <button
        className='str-chat__attachment-preview-error str-chat__attachment-preview-error-file'
        data-testid='file-preview-item-retry-button'
        onClick={() => handleRetry(attachment)}
      >
        <RetryIcon />
      </button>
    )}

    <div className='str-chat__attachment-preview-file-end'>
      <div className='str-chat__attachment-preview-file-name' title={attachment.title}>
        {attachment.title}
      </div>
      {attachment.$internal?.uploadState === 'finished' && (
        <a
          className='str-chat__attachment-preview-file-download'
          download
          href={attachment.asset_url}
          rel='noreferrer'
          target='_blank'
        >
          <DownloadIcon />
        </a>
      )}
      {attachment.$internal?.uploadState === 'uploading' && <LoadingIndicatorIcon size={17} />}
    </div>
  </div>
);

type PreviewItemProps = { id: string };

export const ImagePreviewItem = ({ id }: PreviewItemProps) => {
  const { BaseImage = DefaultBaseImage } = useComponentContext('ImagePreviewItem');
  const { imageUploads, removeImage, uploadImage } = useMessageInputContext('ImagePreviewItem');
  const [previewError, setPreviewError] = useState(false);

  const handleRemove: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation();
      removeImage(id);
    },
    [removeImage, id],
  );
  const handleRetry = useCallback(() => uploadImage(id), [uploadImage, id]);

  const handleLoadError = useCallback(() => setPreviewError(true), []);

  const image = imageUploads[id];
  // do not display scraped attachments
  if (!image || image.og_scrape_url) return null;

  return (
    <div
      className={clsx('str-chat__attachment-preview-image', {
        'str-chat__attachment-preview-image--error': previewError,
      })}
      data-testid='attachment-preview-image'
    >
      <button
        className='str-chat__attachment-preview-delete'
        data-testid='image-preview-item-delete-button'
        disabled={image.state === 'uploading'}
        onClick={handleRemove}
      >
        <CloseIcon />
      </button>

      {image.state === 'failed' && (
        <button
          className='str-chat__attachment-preview-error str-chat__attachment-preview-error-image'
          data-testid='image-preview-item-retry-button'
          onClick={handleRetry}
        >
          <RetryIcon />
        </button>
      )}

      {image.state === 'uploading' && (
        <div className='str-chat__attachment-preview-image-loading'>
          <LoadingIndicatorIcon size={17} />
        </div>
      )}

      {(image.previewUri || image.url) && (
        <BaseImage
          alt={image.file.name}
          className='str-chat__attachment-preview-thumbnail'
          onError={handleLoadError}
          src={image.previewUri ?? image.url}
          title={image.file.name}
        />
      )}
    </div>
  );
};

const FilePreviewItem = ({ id }: PreviewItemProps) => {
  const { fileUploads, removeFile, uploadFile } = useMessageInputContext('FilePreviewItem');

  const handleRemove = useCallback(
    (id: string) => {
      removeFile(id);
    },
    [removeFile],
  );
  const handleRetry = useCallback(
    (attachment: LocalAttachment) => attachment.$internal && uploadFile(attachment.$internal.id),
    [uploadFile],
  );

  const file = fileUploads[id];

  if (!file) return null;

  const attachment: LocalAttachment = {
    $internal: {
      file: file.file as File,
      id,
      uploadState: file.state,
    },
    asset_url: file.url,
    mime_type: file.file.type,
    title: file.file.name,
  };

  return (
    <FilePreview
      attachment={attachment}
      handleRetry={handleRetry}
      removeAttachment={handleRemove}
    />
  );
};
