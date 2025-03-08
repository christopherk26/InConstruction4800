# PowerShell script for Windows - Direct equivalent to the bash script
# This script analyzes project structure and creates a markdown file with code contents

# Output file - save to user's Downloads folder
$DOWNLOADS_DIR = "$env:USERPROFILE\Downloads"
$OUTPUT_FILE = "$DOWNLOADS_DIR\AIpromptFORcodeAssist.md"

# Create Downloads directory if it doesn't exist
if (-not (Test-Path $DOWNLOADS_DIR)) {
    New-Item -ItemType Directory -Force -Path $DOWNLOADS_DIR
}

# Create new file with header
@'
# Project Analysis for AI Code Assistance

I'm working on a group project and need help understanding its structure and serverless implementation. Below is a comprehensive overview of our project, including the directory structure and file contents.

## Project Structure
```
'@ | Set-Content -Path $OUTPUT_FILE -Encoding UTF8

# Windows alternative to 'tree' command
function Get-TreeOutput {
    $root = (Get-Location).Path
    $output = ""
    
    function Add-TreeItem {
        param (
            [string]$Path,
            [string]$Indent = ""
        )
        
        $items = Get-ChildItem -Path $Path | Where-Object {
            # Exclude node_modules, hidden files/dirs, icons, dist, build
            $_.Name -notmatch "^\..*" -and 
            $_.Name -ne "node_modules" -and 
            $_.Name -ne "icons" -and 
            $_.Name -ne "dist" -and 
            $_.Name -ne "build"
        } | Sort-Object Name
        
        foreach ($item in $items) {
            if ($item.PSIsContainer) {
                # It's a directory
                $output += "$Indent|-- $($item.Name)`r`n"
                Add-TreeItem -Path $item.FullName -Indent "$Indent|   "
            } else {
                # It's a file
                $output += "$Indent|-- $($item.Name)`r`n"
            }
        }
        
        return $output
    }
    
    $rootName = Split-Path -Leaf $root
    $output = "$rootName`r`n"
    Add-TreeItem -Path $root -Indent "|-- "
    return $output
}

# Get tree output and append to file
$treeOutput = Get-TreeOutput
Add-Content -Path $OUTPUT_FILE -Value $treeOutput -Encoding UTF8

# Add closing code block and section header
@'
```

## File Contents
Below are the contents of each code file in the project:

'@ | Add-Content -Path $OUTPUT_FILE -Encoding UTF8

# Process files function - this directly matches the bash script's logic
function Process-Files {
    # Find code files with specific extensions
    $codeExtensions = @("ts", "tsx", "js", "jsx", "html", "css", "scss", "sass", 
                        "xml", "md", "py", "java", "go", "rb", "php", "c", "cpp", "h")
    
    # Convert extensions array to a filter pattern
    $extensionPattern = ($codeExtensions | ForEach-Object { "*.$_" }) -join ","
    
    # Get all matching files recursively
    $files = Get-ChildItem -Path "." -Recurse -File -Include $extensionPattern | Where-Object {
        # Exclude paths containing node_modules, hidden dirs, icons, dist, build
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\\.\w" -and
        $_.FullName -notmatch "\\icons\\" -and
        $_.FullName -notmatch "\\dist\\" -and
        $_.FullName -notmatch "\\build\\" -and
        
        # Exclude specific files
        $_.Name -ne "package-lock.json" -and
        $_.Name -ne "yarn.lock" -and
        $_.Name -notmatch "^tsconfig.*\.json$" -and
        $_.Name -notmatch ".*\.config\.js$" -and
        $_.Name -notmatch ".*\.config\.ts$" -and
        $_.Name -notmatch ".*\.conf\.js$" -and
        $_.Name -notmatch ".*\.conf\.ts$"
    } | Sort-Object FullName
    
    # Process each file
    foreach ($file in $files) {
        # Get relative path and convert to Unix-style paths for consistency
        $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
        $relativePath = $relativePath.Replace("\", "/")
        
        # Add file header with path
        Add-Content -Path $OUTPUT_FILE -Value "`n### File: ./$relativePath`n" -Encoding UTF8
        Add-Content -Path $OUTPUT_FILE -Value "```" -Encoding UTF8
        
        # Add file contents
        $fileContent = Get-Content -Path $file.FullName -Raw
        Add-Content -Path $OUTPUT_FILE -Value $fileContent -NoNewline -Encoding UTF8
        
        # Close code block
        Add-Content -Path $OUTPUT_FILE -Value "`n```" -Encoding UTF8
        
        Write-Host "Added $relativePath"
    }
}

# Process all files
Process-Files

# Add instructions for AI
@'

## Instructions for AI

Based on the project structure and file contents above:

1. Please explain what this project does overall.
2. Explain our serverless approach in detail.
3. Describe how the serverless architecture is reflected in all major files.
4. Identify the key components of our architecture and how they interact.
5. explain the different softwares and services used in the project, and where they live in the file structure.
6. Please ask the user what it wants to do, and if it has any questions or needs clarification on the project structure or serverless implementation.

This project implements a serverless architecture using Firebase's ecosystem (Authentication, Firestore, Storage, and Cloud Functions) to eliminate the need for traditional server-side API routes. While we experimented with Next.js API routes in /database/page.tsx, our approach going forward is to have the client directly interact with Firebase services. This serverless model means our front-end components communicate directly with Firebase, eliminating middleware and reducing infrastructure overhead while leveraging Firebase's built-in scaling and security.

Please ask the user what it wants to do, and if it has any questions or needs clarification on the project structure or serverless implementation.

Thank you for your assistance!
'@ | Add-Content -Path $OUTPUT_FILE -Encoding UTF8

Write-Host "Project analysis complete. Output saved to $OUTPUT_FILE"
Write-Host "The file has been saved to your Downloads folder."