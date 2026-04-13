interface UploadResponse {
  objectKey: string;
  publicUrl: string;
  contentType?: string;
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

const uploadFilesToIPFS = async (jsonData: object): Promise<Record<string, UploadResponse> | undefined> => {
  console.log("Uploading website files to QStorage");

  try {
    const files = generateFiles(jsonData);
    const uploadResults: Record<string, UploadResponse> = {};

    for (const [fileName, fileContent] of Object.entries(files)) {
      const response = await fetch(`/api/upload?objectKey=${encodeURIComponent(fileName)}`, {
        method: "POST",
        body: fileContent,
        headers: {
          "Content-Type": fileContent.type,
          "x-file-name": fileName,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to upload ${fileName}`);
      }

      uploadResults[fileName] = (await response.json()) as UploadResponse;
    }

    console.log("Upload complete:", uploadResults);
    return uploadResults;
  } catch (error) {
    console.error("Error uploading files to QStorage:", error);
    return undefined;
  }
};

export default uploadFilesToIPFS;
