# Node.js Installation Guide for Windows

## Recommended Version
**Node.js LTS (Long-Term Support) - Version 20.x or 22.x**
- LTS versions are stable and recommended for production
- Currently: Node.js 20.10.0+ or 22.x LTS
- Includes npm automatically

## Installation Steps

### Step 1: Download Node.js
1. Visit: **https://nodejs.org/**
2. Click the **LTS** button (recommended) - this will download the Windows installer
3. The installer file will be named something like: `node-v20.x.x-x64.msi`

### Step 2: Install Node.js
1. **Run the downloaded .msi installer**
2. Click **Next** through the setup wizard
3. **IMPORTANT**: Make sure "Add to PATH" is checked (it should be by default)
4. Accept the license agreement
5. Choose installation location (default is fine: `C:\Program Files\nodejs\`)
6. Click **Install** (you may need administrator privileges)
7. Wait for installation to complete
8. Click **Finish**

### Step 3: Verify Installation
1. **Close and reopen** your terminal/PowerShell (or restart Cursor IDE)
2. Run these commands to verify:

```powershell
node -v
npm -v
```

You should see version numbers like:
```
v20.10.0
10.2.3
```

### Step 4: Verify in Cursor IDE
1. **Restart Cursor IDE** completely (close and reopen)
2. Open a new terminal in Cursor (Terminal → New Terminal)
3. Run:
```powershell
node -v
npm -v
```

If you see version numbers, Cursor can see Node.js!

## Troubleshooting

### If Node.js is not recognized after installation:

1. **Check if Node.js is in PATH:**
   ```powershell
   $env:PATH
   ```
   Look for `C:\Program Files\nodejs\` in the output

2. **If not in PATH, add it manually:**
   - Press `Win + X` → System → Advanced system settings
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\Program Files\nodejs\`
   - Click OK on all dialogs
   - **Restart Cursor IDE**

3. **Verify installation location:**
   ```powershell
   Test-Path "C:\Program Files\nodejs\node.exe"
   ```
   Should return `True`

4. **If still not working:**
   - Restart your computer
   - Open a new PowerShell window (not in Cursor)
   - Run `node -v` to test
   - If it works there, restart Cursor IDE

## After Installation

Once Node.js is installed, you can:

1. Navigate to your frontend folder:
   ```powershell
   cd frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the development server:
   ```powershell
   npm run dev
   ```

## Quick Test

After installation, test everything works:
```powershell
cd frontend
npm install
npm run dev
```

You should see Vite starting up with a local server URL!







