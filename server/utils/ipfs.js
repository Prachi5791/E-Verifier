const PINATA_JWT = process.env.PINATA_JWT;
export async function pinBuffer(
  buffer,
  filename = "file.bin",
  type = "application/octet-stream"
) {
  const data = new FormData();
  data.append("file", new Blob([buffer], { type }), filename);

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: data,
    }
  );

  const result = await response.json();

  if (!result.IpfsHash) {
    throw new Error(`Pinata upload failed: ${JSON.stringify(result)}`);
  }

  return result.IpfsHash;
}
