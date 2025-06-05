import { PinataSDK } from "pinata-web3";

interface PinResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate?: boolean;
}

const generateFiles = (jsonData: object) => {
  return {
    "index.html": new Blob([`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPFS Static Site</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Welcome to My IPFS-Published Website</h1>
    </header>
    <main>
        <p>This is a simple static webpage that can be published on IPFS.</p>
        <p><a href=".well-known/farcaster-preferences.json">View Farcaster Preferences JSON</a></p>
    </main>
</body>
</html>`], { type: "text/html" }),
    "styles.css": new Blob([`body {
    font-family: Arial, sans-serif;
    text-align: center;
    margin: 50px;
}`], { type: "text/css" }),
    ".well-known/farcaster-preferences.json": new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" })
  };
};

const uploadFilesToIPFS = async (jsonData: object): Promise<Record<string, PinResponse> | undefined> => {
  const pinata = new PinataSDK({
    pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT!,
    pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY!,
  });

  console.log("Uploading website files to Pinata");

  try {
    const files = generateFiles(jsonData);
    const uploadResults: Record<string, PinResponse> = {};

    for (const [fileName, fileContent] of Object.entries(files)) {
      // Convert Blob to a File by specifying a file name, type, and lastModified date.
      const fileObj = new File([fileContent], fileName, { 
        type: fileContent.type, 
        lastModified: Date.now() 
      });
      const upload = await pinata.upload.file(fileObj).addMetadata({
        name: fileName,
      });
      uploadResults[fileName] = upload;
    }

    console.log("Upload complete:", uploadResults);
    return uploadResults;
  } catch (error) {
    console.error("Error uploading files to Pinata:", error);
    return undefined;
  }
};

export default uploadFilesToIPFS;
