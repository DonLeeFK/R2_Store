// index.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const token = url.searchParams.get('token');

    // Token verification function
    const verifyToken = () => {
      if (env.TOKEN && env.TOKEN !== token) {
        return new Response('Unauthorized', { status: 401 });
      }
      return null;
    };

    // Handle root path
    if (path === '/') {
      // If token is required but not provided, show verification page
      if (env.TOKEN && !token) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Token Verification</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body {
                  font-family: 'Segoe UI', Arial, sans-serif;
                  background: #f4f6fb;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                }
                .container {
                  background: #fff;
                  padding: 2rem 2.5rem;
                  border-radius: 10px;
                  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
                  min-width: 320px;
                  text-align: center;
                }
                input[type="text"] {
                  padding: 0.5rem;
                  width: 70%;
                  border: 1px solid #ccc;
                  border-radius: 5px;
                  margin-bottom: 1rem;
                  font-size: 1rem;
                }
                button {
                  padding: 0.5rem 1.5rem;
                  background: #2563eb;
                  color: #fff;
                  border: none;
                  border-radius: 5px;
                  font-size: 1rem;
                  cursor: pointer;
                  transition: background 0.2s;
                }
                button:hover {
                  background: #1e40af;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Enter Token</h1>
                <form method="GET">
                  <input type="text" name="token" placeholder="Token" required>
                  <br>
                  <button type="submit">Verify</button>
                </form>
              </div>
            </body>
          </html>
        `;
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Check token for homepage access
      if (env.TOKEN) {
        const tokenError = verifyToken();
        if (tokenError) return tokenError;
      }

      if (request.method === 'POST') {
        // Handle file upload or delete
        const formData = await request.formData();
        const action = formData.get('action');
        if (action === 'delete') {
          // Handle file deletion
          const key = formData.get('key');
          const deleteToken = formData.get('token');
          if (env.TOKEN && env.TOKEN !== deleteToken) {
            return new Response('Unauthorized', { status: 401 });
          }
          if (!key) return new Response('No file specified', { status: 400 });
          await env.R2.delete(key);
          return Response.redirect(url.origin + (token ? `?token=${token}` : ''));
        }

        const file = formData.get('file');
        const uploadToken = formData.get('token');

        // Verify upload token
        if (env.TOKEN && env.TOKEN !== uploadToken) {
          return new Response('Unauthorized', { status: 401 });
        }

        if (!file) return new Response('No file uploaded', { status: 400 });

        await env.R2.put(file.name, file.stream());
        return Response.redirect(url.origin + (token ? `?token=${token}` : ''));
      }

      // List files and show upload form
      const files = await env.R2.list();
      const fileList = files.objects.length
        ? files.objects.map(file => 
            `<li class="file-item" data-key="${file.key}">
              <a href="${url.origin}/${file.key}${env.TOKEN ? `?token=${env.TOKEN}` : ''}" target="_blank">
                <span style="font-weight:500;">${file.key}</span>
              </a>
              <form method="post" class="delete-form" onsubmit="return confirm('Delete this file?');">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="key" value="${file.key}">
                ${env.TOKEN ? `<input type="hidden" name="token" value="${env.TOKEN}">` : ''}
                <button type="submit" class="delete-btn" title="Delete ${file.key}">&times;</button>
              </form>
            </li>`
          ).join('')
        : '<li style="color:#888;">No files uploaded yet.</li>';

      // Only show token input if token is required and not already provided
      let uploadForm;
      if (env.TOKEN && !token) {
        uploadForm = `
          <form method="post" enctype="multipart/form-data" class="upload-form">
            <input type="file" name="file" required>
            <input type="text" name="token" placeholder="Token" required>
            <button type="submit">Upload</button>
          </form>
        `;
      } else if (env.TOKEN && token) {
        uploadForm = `
          <form method="post" enctype="multipart/form-data" class="upload-form">
            <input type="file" name="file" required>
            <input type="hidden" name="token" value="${token}">
            <button type="submit">Upload</button>
          </form>
        `;
      } else {
        uploadForm = `
          <form method="post" enctype="multipart/form-data" class="upload-form">
            <input type="file" name="file" required>
            <button type="submit">Upload</button>
          </form>
        `;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>R2 File Storage</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                background: #f4f6fb;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 480px;
                margin: 3rem auto 2rem auto;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 2px 16px rgba(0,0,0,0.08);
                padding: 2.5rem 2rem;
              }
              h1 {
                margin-top: 0;
                color: #2563eb;
                font-size: 2rem;
                letter-spacing: 1px;
                text-align: center;
              }
              .upload-form {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                margin-bottom: 2rem;
                align-items: stretch;
              }
              input[type="file"], input[type="text"] {
                padding: 0.5rem;
                border: 1px solid #ccc;
                border-radius: 5px;
                font-size: 1rem;
              }
              button {
                padding: 0.6rem 0;
                background: #2563eb;
                color: #fff;
                border: none;
                border-radius: 5px;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.2s;
              }
              button:hover {
                background: #1e40af;
              }
              h2 {
                margin-bottom: 0.5rem;
                color: #222;
                font-size: 1.2rem;
              }
              ul {
                list-style: none;
                padding: 0;
                margin: 0;
              }
              li {
                background: #f4f6fb;
                margin-bottom: 0.5rem;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                transition: background 0.2s;
              }
              li:hover {
                background: #e0e7ff;
              }
              a {
                color: #2563eb;
                text-decoration: none;
                font-size: 1rem;
              }
              a:hover {
                text-decoration: underline;
              }
              /* Footer styles */
              .footer {
                text-align: center;
                margin-top: 2rem;
                color: #888;
                font-size: 1rem;
              }
              .footer a {
                color: #222;
                text-decoration: none;
                margin-left: 0.3em;
                vertical-align: middle;
                transition: color 0.2s;
              }
              .footer a:hover {
                color: #2563eb;
              }
              .github-icon {
                width: 1.2em;
                height: 1.2em;
                vertical-align: middle;
                fill: currentColor;
                margin-right: 0.2em;
              }
              .file-item {
                position: relative;
                padding-right: 2.5em;
              }
              .delete-form {
                position: absolute;
                right: 0.5em;
                top: 50%;
                transform: translateY(-50%);
                margin: 0;
                display: inline-block;
              }
              .delete-btn {
                background: none;
                color: #ef4444;
                border: none;
                border-radius: 50%;
                width: 1.8em;
                height: 1.8em;
                font-size: 1.4em;
                cursor: pointer;
                opacity: 0.85;
                transition: color 0.2s, opacity 0.2s;
                line-height: 1;
                padding: 0;
              }
              .delete-btn:hover {
                color: #b91c1c;
                opacity: 1;
                background: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>R2 File Storage</h1>
              ${uploadForm}
              <h2>Stored Files</h2>
              <ul>${fileList}</ul>
            </div>
            <div class="footer">
              <a href="https://github.com/DonLeeFK/R2_Store" target="_blank" rel="noopener" title="GitHub">
                <svg class="github-icon" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                  0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
                  -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2
                  -3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64
                  -.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08
                  2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
                  1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                DonLeeFK
              </a>
            </div>
            <script>
              // Prevent click on delete button from opening the file link
              document.addEventListener('DOMContentLoaded', function() {
                document.querySelectorAll('.file-item .delete-form').forEach(function(form) {
                  form.addEventListener('click', function(e) {
                    e.stopPropagation();
                  });
                });
              });
            </script>
          </body>
        </html>
      `;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Handle file access
    // Use decodeURIComponent to support spaces and special characters in file names
    const fileName = decodeURIComponent(path.slice(1));
    if (env.TOKEN) {
      const tokenError = verifyToken();
      if (tokenError) return tokenError;
    }

    const file = await env.R2.get(fileName);
    if (!file) return new Response('File not found', { status: 404 });

    const headers = new Headers();
    file.writeHttpMetadata(headers);
    headers.set('etag', file.httpEtag);

    return new Response(file.body, { headers });
  },
};
