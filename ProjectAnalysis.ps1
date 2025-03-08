# PowerShell script to analyze project structure for AI code assistance

# Output file - save to user's Downloads folder
$DOWNLOADS_DIR = "$env:USERPROFILE\Downloads"
$OUTPUT_FILE = "$DOWNLOADS_DIR\AIpromptFORcodeAssist.md"

# Create Downloads directory if it doesn't exist (usually exists by default on Windows)
if (-not (Test-Path $DOWNLOADS_DIR)) {
    New-Item -ItemType Directory -Path $DOWNLOADS_DIR
}

# Create new file with header
@'
# Project Analysis for AI Code Assistance

I'm working on a group project and need help understanding its structure and serverless implementation. Below is a comprehensive overview of our project, including the directory structure and file contents.

## Project Structure
```
'@ | Out-File -FilePath $OUTPUT_FILE -Encoding utf8

# Get the directory structure
# Note: Windows doesn't have 'tree' with the same options as Linux
# Using PowerShell's Get-ChildItem as an alternative
function Get-DirectoryTree {
    param (
        [string]$Path = "."
    )
    
    $indent = 0
    $result = ""
    
    function Traverse {
        param (
            [string]$CurrentPath,
            [int]$CurrentIndent
        )
        
        $items = Get-ChildItem -Path $CurrentPath | Where-Object {
            $_.Name -notmatch '^\..*' -and 
            $_.Name -ne "node_modules" -and 
            $_.Name -ne "icons" -and 
            $_.Name -ne "dist" -and 
            $_.Name -ne "build"
        } | Sort-Object Name
        
        foreach ($item in $items) {
            $indentStr = " " * $CurrentIndent
            
            if ($item.PSIsContainer) {
                # It's a directory
                $script:result += "$indentStr|-- $($item.Name)`r`n"
                Traverse -CurrentPath $item.FullName -CurrentIndent ($CurrentIndent + 4)
            }
            else {
                # It's a file
                $script:result += "$indentStr|-- $($item.Name)`r`n"
            }
        }
    }
    
    $script:result = "$Path`r`n"
    Traverse -CurrentPath $Path -CurrentIndent 4
    return $script:result
}

# Get the directory tree and append to file
$treeOutput = Get-DirectoryTree -Path "."
Add-Content -Path $OUTPUT_FILE -Value $treeOutput

# Add closing code block and section header
@'
```

## File Contents
Below are the contents of each code file in the project:

'@ | Add-Content -Path $OUTPUT_FILE

# Function to process files
function Process-Files {
    # Define code file extensions to include
    $codeExtensions = @(".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".scss", ".sass", 
                        ".xml", ".md", ".py", ".java", ".go", ".rb", ".php", ".c", ".cpp", ".h")
    
    # Files to exclude
    $excludeFiles = @("package-lock.json", "yarn.lock")
    $excludePatterns = @("tsconfig*.json", "*.config.js", "*.config.ts", "*.conf.js", "*.conf.ts")
    
    # Directories to exclude
    $excludeDirs = @("node_modules", ".git", "icons", "dist", "build")
    
    # Find and process code files
    Get-ChildItem -Path "." -Recurse -File | 
        Where-Object {
            # Check if the file extension is in our list
            $ext = [System.IO.Path]::GetExtension($_.Name)
            $codeExtensions -contains $ext -and
            
            # Exclude specific files
            $excludeFiles -notcontains $_.Name -and
            
            # Exclude files matching patterns
            -not ($excludePatterns | ForEach-Object { $_.Name -like $_ }) -and
            
            # Exclude directories
            -not ($_.FullName | Where-Object {
                foreach ($dir in $excludeDirs) {
                    if ($_.FullName -match "\\$dir\\") { return $true }
                }
                return $false
            })
        } | 
        Sort-Object FullName | 
        ForEach-Object {
            $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1)
            $relativePath = $relativePath.Replace("\", "/")
            
            # Add file header with path
            Add-Content -Path $OUTPUT_FILE -Value "`n### File: ./$relativePath`n"
            Add-Content -Path $OUTPUT_FILE -Value "```"
            
            # Add file contents
            Get-Content -Path $_.FullName -Raw | Add-Content -Path $OUTPUT_FILE -NoNewline
            
            # Close code block
            Add-Content -Path $OUTPUT_FILE -Value "`n```"
            
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
'@ | Add-Content -Path $OUTPUT_FILE

Write-Host "Project analysis complete. Output saved to $OUTPUT_FILE"
Write-Host "The file has been saved to your Downloads folder."