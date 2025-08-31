import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { exec } from 'child_process';

const program = new Command();

program
  .option('-p, --port <number>', 'ポート番号を指定', '8081')
  .option('-D, --disable-upload', 'アップロード機能を無効化')
  .parse(process.argv);

const options = program.opts();
const port = parseInt(options.port, 10);
const disableUpload = options.disableUpload;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

if (!disableUpload) {
  app.use(
    fileUpload({
      createParentPath: true,
      limits: { fileSize: 1024 * 1024 * 1024 * 10 },
      useTempFiles: true,
      tempFileDir: '/tmp/',
      preserveExtension: true,
      uriDecodeFileNames: true,
    })
  );

  app.post('/api/upload', (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const uploadedFiles = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    const uploadResults = [];
    const filesDir = path.join(__dirname, '../files');

    for (const file of uploadedFiles) {
      const fileName = generateUniqueFilename(file.name, filesDir);
      const filePath = path.join(filesDir, fileName);

      try {
        file.mv(filePath);
        uploadResults.push({
          originalName: fileName,
          fileName: fileName,
          size: file.size,
          url: `/files/${encodeURIComponent(fileName)}`,
        });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error uploading file.' });
      }
    }

    res.json({ files: uploadResults });
  });
}

function generateUniqueFilename(originalName: string, filesDir: string): string {
  const decodedName = Buffer.from(originalName, 'latin1').toString('utf8');
  const ext = path.extname(decodedName);
  const baseName = path.basename(decodedName, ext);
  let counter = 1;
  let fileName = decodedName;

  while (fs.existsSync(path.join(filesDir, fileName))) {
    fileName = `${baseName} (${counter})${ext}`;
    counter++;
  }

  return fileName;
}

function generateUniqueFilenameFromUtf8(originalName: string, filesDir: string): string {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  let counter = 1;
  let fileName = originalName;

  while (fs.existsSync(path.join(filesDir, fileName))) {
    fileName = `${baseName} (${counter})${ext}`;
    counter++;
  }

  return fileName;
}

function isAllowedIP(ip: string): boolean {
  const ipPattern = /^192\.168\.(\d+)\.(\d+)$/;
  const match = ip.match(ipPattern);

  if (!match) return false;

  const thirdOctet = parseInt(match[1], 10);
  const fourthOctet = parseInt(match[2], 10);

  return thirdOctet === 168 && fourthOctet >= 2 && fourthOctet <= 99;
}

app.get('/api/files', (req, res) => {
  const filesDir = path.join(__dirname, '../files');

  try {
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    const files = fs
      .readdirSync(filesDir)
      .filter(file => !file.startsWith('.'))
      .map(fileName => {
        const filePath = path.join(filesDir, fileName);
        const stats = fs.statSync(filePath);
        return {
          originalName: fileName,
          fileName: fileName,
          size: stats.size,
          url: `/files/${encodeURIComponent(fileName)}`,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error reading files directory.' });
  }
});

app.post('/api/update', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '';

  if (clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.startsWith('::ffff:127.0.0.1')) {
    console.log('Update request from localhost');
  } else if (!isAllowedIP(clientIP)) {
    console.log(`Update request denied from IP: ${clientIP}`);
    return res.status(403).json({
      error: 'Access denied. Only local network (192.168.*.2-99) and localhost are allowed.',
      clientIP: clientIP,
    });
  }

  console.log(`Update request approved from IP: ${clientIP}`);

  exec('git pull', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      console.error('Git pull error:', error);
      return res.status(500).json({
        error: 'Failed to pull from git repository',
        details: error.message,
        stderr: stderr,
      });
    }

    console.log('Git pull successful:', stdout);

    res.json({
      message: 'Update successful. Server will restart in 2 seconds.',
      gitOutput: stdout,
      restarting: true,
    });

    setTimeout(() => {
      console.log('Restarting server...');
      process.exit(0);
    }, 2000);
  });
});

app.delete('/api/files/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, '../files', fileName);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'File deleted successfully.' });
    } else {
      res.status(404).json({ error: 'File not found.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting file.' });
  }
});

app.put('/api/files/:fileName/rename', (req, res) => {
  const oldFileName = req.params.fileName;
  const { newName } = req.body;

  if (!newName) {
    return res.status(400).json({ error: 'New name is required.' });
  }

  const filesDir = path.join(__dirname, '../files');
  const uniqueNewName = generateUniqueFilenameFromUtf8(newName, filesDir);
  const oldPath = path.join(filesDir, oldFileName);
  const newPath = path.join(filesDir, uniqueNewName);

  try {
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      res.json({
        message: 'File renamed successfully.',
        newFileName: uniqueNewName,
        url: `/files/${uniqueNewName}`,
      });
    } else {
      res.status(404).json({ error: 'File not found.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error renaming file.' });
  }
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/upload.html'));
});

app.get('/files', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/files.html'));
});
app.use('/files', express.static(path.join(__dirname, '../files')));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  if (disableUpload) {
    console.log('Upload functionality is disabled');
  }
});
