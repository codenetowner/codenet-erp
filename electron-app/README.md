# Catalyst ERP - Electron App

Desktop application wrapper for Catalyst ERP.

## Building

1. Run `build.bat` to:
   - Build the React frontend for production
   - Publish the .NET backend
   - Copy files to the correct locations
   - Install Electron dependencies

2. Test with `npm start`

3. Create installer with `npm run build`

## Structure

```
electron-app/
├── main.js          # Electron main process
├── preload.js       # Preload script
├── renderer/        # Built frontend (created by build.bat)
├── package.json     # Electron config & dependencies
└── build.bat        # Build script
```

## How it works

1. Electron starts and launches the .NET backend as a child process
2. An Express server serves the built React frontend on port 3000
3. The Electron window loads http://localhost:3000
4. Frontend calls backend API at http://localhost:5227
