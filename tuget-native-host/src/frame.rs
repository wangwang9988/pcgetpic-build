use std::io;

use thiserror::Error;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

#[derive(Debug, Error)]
pub enum FrameError {
    #[error("I/O error while processing a length-prefixed message: {0}")]
    Io(#[from] io::Error),
    #[error("zero-length messages are not valid JSON")]
    Empty,
    #[error("message is {actual} bytes, exceeding the {limit}-byte limit")]
    TooLarge { actual: usize, limit: usize },
}

pub async fn read_frame<R>(reader: &mut R, max_bytes: usize) -> Result<Option<Vec<u8>>, FrameError>
where
    R: AsyncRead + Unpin,
{
    let mut prefix = [0_u8; 4];
    let first = reader.read(&mut prefix[..1]).await?;
    if first == 0 {
        return Ok(None);
    }
    reader.read_exact(&mut prefix[1..]).await?;

    let length = u32::from_le_bytes(prefix) as usize;
    if length == 0 {
        return Err(FrameError::Empty);
    }
    if length > max_bytes {
        return Err(FrameError::TooLarge {
            actual: length,
            limit: max_bytes,
        });
    }

    let mut payload = vec![0_u8; length];
    reader.read_exact(&mut payload).await?;
    Ok(Some(payload))
}

pub async fn write_frame<W>(
    writer: &mut W,
    payload: &[u8],
    max_bytes: usize,
) -> Result<(), FrameError>
where
    W: AsyncWrite + Unpin,
{
    if payload.is_empty() {
        return Err(FrameError::Empty);
    }
    if payload.len() > max_bytes {
        return Err(FrameError::TooLarge {
            actual: payload.len(),
            limit: max_bytes,
        });
    }
    let length = u32::try_from(payload.len()).map_err(|_| FrameError::TooLarge {
        actual: payload.len(),
        limit: u32::MAX as usize,
    })?;

    writer.write_all(&length.to_le_bytes()).await?;
    writer.write_all(payload).await?;
    writer.flush().await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::HOST_TO_EXTENSION_MAX_BYTES;
    use tokio::io::duplex;

    #[tokio::test]
    async fn round_trips_utf8_with_little_endian_length() {
        let (mut left, mut right) = duplex(256);
        let payload = r#"{"message":"你好"}"#.as_bytes();

        let write = write_frame(&mut left, payload, 256);
        let read = read_frame(&mut right, 256);
        let ((), decoded) = tokio::try_join!(write, read).expect("round trip");

        assert_eq!(decoded.as_deref(), Some(payload));
    }

    #[tokio::test]
    async fn rejects_oversized_length_before_allocating_payload() {
        let (mut left, mut right) = duplex(16);
        left.write_all(&1025_u32.to_le_bytes())
            .await
            .expect("write prefix");

        let error = read_frame(&mut right, 1024)
            .await
            .expect_err("oversized frame must fail");
        assert!(matches!(
            error,
            FrameError::TooLarge {
                actual: 1025,
                limit: 1024
            }
        ));
    }

    #[tokio::test]
    async fn returns_none_only_for_clean_eof_before_a_prefix() {
        let (left, mut right) = duplex(16);
        drop(left);
        assert!(
            read_frame(&mut right, 16)
                .await
                .expect("clean eof")
                .is_none()
        );
    }

    #[tokio::test]
    async fn rejects_host_output_larger_than_one_megabyte() {
        let (mut left, _right) = duplex(16);
        let oversized = vec![b'x'; HOST_TO_EXTENSION_MAX_BYTES + 1];
        let error = write_frame(&mut left, &oversized, HOST_TO_EXTENSION_MAX_BYTES)
            .await
            .expect_err("host output over 1 MiB must fail");
        assert!(matches!(
            error,
            FrameError::TooLarge {
                actual,
                limit: HOST_TO_EXTENSION_MAX_BYTES
            } if actual == HOST_TO_EXTENSION_MAX_BYTES + 1
        ));
    }
}
