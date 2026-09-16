# Facebook Image Downloader

A lightweight web application that extracts images from a Facebook post
URL and allows users to preview and download them individually or as a
ZIP file.

## Features

-   Extract images from Facebook post URLs
-   Supports Facebook posts containing more than 5 images
-   Extract multiple images from supported posts
-   Preview extracted images before downloading
-   Download images individually
-   Download all extracted images as a ZIP file
-   Simple and responsive web interface
-   Node.js backend
-   Express.js API
-   Client-side image preview and download interface

## How It Works

The application takes a Facebook post URL and sends it to the backend
for processing.

The backend attempts to extract the available image URLs from the
Facebook post. The extracted images are then returned to the frontend,
where they can be previewed and downloaded.

Users can either:

-   Download images individually
-   Download all extracted images together as a ZIP archive

### Basic Workflow

``` text
Facebook Post URL
        │
        ▼
   Web Interface
        │
        ▼
    Node.js API
        │
        ▼
  Image Extraction
        │
        ▼
  Extracted Images
        │
        ├───────────────┐
        ▼               ▼
Individual Download   ZIP Download
```

## Tech Stack

### Frontend

-   HTML
-   CSS
-   JavaScript

### Backend

-   Node.js
-   Express.js

### Other

-   Image extraction/parsing logic
-   ZIP file generation
-   npm package ecosystem

## Project Structure

``` text
fb-image-downloader/
│
├── node_modules/
│   └── Installed npm dependencies
│
├── public/
│   └── Frontend files
│
├── extractor.js
│   └── Facebook image extraction logic
│
├── server.js
│   └── Node.js / Express server
│
├── test_api.js
│   └── API testing
│
├── package.json
│   └── Project configuration and dependencies
│
├── package-lock.json
│   └── Locked dependency versions
│
└── README.md
    └── Project documentation
```

## Requirements

Before running the project locally, make sure you have:

-   Node.js installed
-   npm installed
-   An internet connection

You can verify Node.js and npm with:

``` bash
node --version
npm --version
```

## Installation

### 1. Clone the Repository

``` bash
git clone https://github.com/YOUR_USERNAME/fb-image-downloader.git
```

### 2. Open the Project Directory

``` bash
cd fb-image-downloader
```

### 3. Install Dependencies

``` bash
npm install
```

This installs all dependencies defined in `package.json`.

## Running the Application

Start the server with:

``` bash
npm start
```

If the project does not have an `npm start` script configured, run:

``` bash
node server.js
```

After starting the server, open:

``` text
http://localhost:3000
```

in your browser.

## Usage

1.  Open the application.
2.  Paste a Facebook post URL into the input field.
3.  Start the extraction process.
4.  Wait for the extraction to complete.
5.  Review the extracted images.
6.  Download individual images if needed.
7.  Use the ZIP download option to download all extracted images
    together.

## Example

Input:

``` text
https://www.facebook.com/...
```

The application processes the URL and attempts to return all accessible
images associated with the supported Facebook post.

The result may contain multiple images, including posts containing more
than five images.

## API

The application includes a Node.js/Express backend that handles the
extraction process.

The backend implementation is located in:

``` text
server.js
```

The image extraction logic is located in:

``` text
extractor.js
```

API routes may vary depending on the current implementation.

Refer to `server.js` for the currently available endpoints and request
formats.

## Testing

The repository contains:

``` text
test_api.js
```

which can be used to test the API functionality.

Run it with:

``` bash
node test_api.js
```

The exact test behavior depends on the implementation of the file.

## Development

For development, run the application locally:

``` bash
npm install
npm start
```

Make changes to the frontend or backend files and restart the server
when necessary.

### Frontend

Frontend files are located inside:

``` text
public/
```

### Backend

The main backend server is:

``` text
server.js
```

### Extraction Logic

Facebook image extraction is handled by:

``` text
extractor.js
```

## Deployment

This project contains a Node.js backend and therefore requires a hosting
platform capable of running server-side Node.js code.

### GitHub Pages

GitHub Pages is suitable for static websites but does not run a normal
Node.js/Express backend.

Therefore, GitHub Pages alone is not suitable for deploying the complete
application.

### Vercel

Vercel can host frontend applications and server-side functions, but the
current Express/Node.js architecture may require modifications before
deployment.

### Other Hosting Options

Node.js-compatible platforms may also be used, including:

-   Render
-   Railway
-   Other Node.js hosting providers

The appropriate deployment configuration depends on the current backend
implementation and the extraction libraries being used.

## Environment Variables

If the application requires API keys, credentials, configuration values,
or other secrets, store them in environment variables rather than
committing them to GitHub.

Example:

``` env
API_KEY=your_api_key_here
```

Do not commit:

``` text
.env
```

or any file containing private credentials.

If environment variables are required in production, configure them
through the hosting provider's environment-variable settings.

## Important Security Notes

Never expose private API keys, authentication tokens, cookies,
passwords, or other credentials in frontend JavaScript or public GitHub
repositories.

Do not commit sensitive files such as:

``` text
.env
credentials.json
cookies.json
```

unless they contain no sensitive information.

## Limitations

Facebook's website, page structure, access controls, and anti-automation
systems can change over time.

Because of this, extraction may not work for every Facebook post.

Possible limitations include:

-   Private posts may not be accessible.
-   Restricted posts may not be accessible.
-   Deleted posts cannot be extracted.
-   Login-required content may not be accessible.
-   Facebook may change its HTML or internal data structures.
-   Image URLs may expire or become unavailable.
-   Some posts may use formats that are not supported by the extractor.
-   Very large posts may require additional processing time.
-   Network or server restrictions may affect extraction.

The application should therefore be considered dependent on the current
accessibility and structure of the target Facebook content.

## Responsible Use

This project is intended for legitimate use with content that the user
is authorized to access and download.

Users are responsible for complying with:

-   Facebook's applicable terms and policies
-   Copyright laws
-   Intellectual property rights
-   Privacy laws
-   Applicable local regulations

Do not use the application to access private content without
authorization or to download and redistribute copyrighted material
without permission.

## Privacy

The application should not be used to collect, store, or distribute
personal information without appropriate authorization.

If the production version stores submitted URLs, extracted images, user
accounts, analytics, or other user information, the production
deployment should provide an appropriate privacy policy explaining what
information is collected, why it is collected, how long it is retained,
and how it is handled.

## Performance

Performance depends on:

-   Facebook response time
-   Number of images in the post
-   Image sizes
-   Server resources
-   Network speed
-   Extraction method
-   ZIP generation time

Large posts containing many high-resolution images may take longer to
process.

## Error Handling

The application should provide appropriate feedback when:

-   The Facebook URL is invalid.
-   The post cannot be accessed.
-   No images are found.
-   Image extraction fails.
-   An image cannot be downloaded.
-   ZIP generation fails.
-   The server encounters an unexpected error.

## Future Improvements

Possible future improvements include:

-   Drag-and-drop URL input
-   Download progress indicators
-   Improved extraction reliability
-   Better error messages
-   Image selection before ZIP creation
-   Custom ZIP filenames
-   Image metadata
-   Download history
-   Batch URL processing
-   User accounts
-   Usage limits
-   Premium features
-   API access
-   Browser extension
-   Cloud-based processing
-   Custom domain
-   Analytics
-   Improved mobile experience

## Contributing

Contributions, suggestions, bug reports, and improvements are welcome.

To contribute:

1.  Fork the repository.
2.  Create a new branch.

``` bash
git checkout -b feature/your-feature
```

3.  Make your changes.
4.  Test the application.
5.  Commit your changes.

``` bash
git add .
git commit -m "Add your feature"
```

6.  Push the branch.

``` bash
git push origin feature/your-feature
```

7.  Open a Pull Request.

## Issues

If you find a bug or have a feature request, open an issue in the GitHub
repository.

When reporting a bug, include:

-   What you were trying to do
-   What happened
-   What you expected to happen
-   Relevant error messages
-   Browser information
-   Node.js version
-   Steps to reproduce the problem

Do not include passwords, cookies, access tokens, API keys, or other
sensitive information in an issue.

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files, to deal in the
Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
