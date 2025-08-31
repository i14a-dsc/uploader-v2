[日本語版](./README-ja.md)

# Uploader

A simple and fast file sharing application for local networks

## Overview

Uploader is a web application designed for easy file sharing within a local network. With just a browser, you can easily upload, download, and share files.

It features a responsive design that works smoothly on various devices including PCs, tablets, and smartphones.

## Features

- **File Upload**: Upload files using drag & drop or the file selection dialog
- **File Management**: View, delete, and rename uploaded files
- **File Sharing**: Share files with others by sharing URLs
- **File Preview**: Preview files supported by the browser
- **Responsive Design**: Adapts to various screen sizes from smartphones to desktops

## Installation

### Prerequisites

- Node.js (v18 or higher)
- Bun@^1.1.43 (required for building if not using ts-node)

### Installation Steps

1. Clone the repository:

```bash
git clone https://github.com/i14a-dsc/uploader.git
cd uploader
```

2. Install dependencies:

```bash
bun install
```

or

```bash
node install
```

3. Start the application:

```bash
bun start
```

or

After each installation/update:

```bash
bun run build
```

Then:

```bash
node start:node
```

4. Access the application in your browser at http://localhost:8081

## Usage

### Home Screen

The home screen displays a list of recently uploaded files. You can click the "Upload Files" button to upload files or click the "Browse Files" button to view all files.

### Uploading Files

On the "Upload" page, you can drag & drop files or click the "Choose Files" button to select files.

### Managing Files

On the "Files" page, you can see a list of all uploaded files. For each file, you can:

- **Preview**: Open and view the file in the browser
- **Download**: Download the file to your device
- **Share**: View the sharing URL for the file
- **Rename**: Change the file name
- **Delete**: Remove the file

## Customization

### Changing the Port Number

By default, the application runs on port 8081. You can change this by editing the `port` variable in the `src/server.ts` file.

### Changing the File Storage Location

Files are stored in the `files` directory. To change the storage location, modify the relevant paths in the `src/server.ts` file.

## License

This project is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Bug reports and feature requests can be submitted on the GitHub Issues page. Pull requests are also welcome.

---

_Note: This README was translated from Japanese to English using AI translation tools._
