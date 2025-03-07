#!/bin/bash

# Output file - save to user's Downloads folder
DOWNLOADS_DIR="$HOME/Downloads"
OUTPUT_FILE="$DOWNLOADS_DIR/AIpromptFORcodeAssist.md"

# Create Downloads directory if it doesn't exist
mkdir -p "$DOWNLOADS_DIR"

# Create new file with header
cat > "$OUTPUT_FILE" << 'EOF'
# Project Analysis for AI Code Assistance

I'm working on a group project and need help understanding its structure and serverless implementation. Below is a comprehensive overview of our project, including the directory structure and file contents.

## Project Structure
\`\`\`
EOF

# Get the directory tree and append to file
tree -I "node_modules|.*|icons|dist|build" . >> "$OUTPUT_FILE"

# Add closing code block and section header
cat >> "$OUTPUT_FILE" << 'EOF'
\`\`\`

## File Contents
Below are the contents of each code file in the project:

EOF

# Function to process files
process_files() {
  # Find only code files with common code extensions, excluding config and lock files
  find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
    -o -name "*.html" -o -name "*.css" -o -name "*.scss" -o -name "*.sass" \
    -o -name "*.xml" -o -name "*.md" -o -name "*.py" -o -name "*.java" -o -name "*.go" \
    -o -name "*.rb" -o -name "*.php" -o -name "*.c" -o -name "*.cpp" -o -name "*.h" \) \
    -not -path "*/node_modules/*" -not -path "*/\.*" -not -path "*/icons/*" \
    -not -path "*/dist/*" -not -path "*/build/*" \
    -not -name "package-lock.json" -not -name "yarn.lock" \
    -not -name "tsconfig*.json" -not -name "*.config.js" -not -name "*.config.ts" \
    -not -name "*.conf.js" -not -name "*.conf.ts" | sort | while read -r file; do
    
    # Add file header with path
    echo -e "\n### File: $file\n" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    
    # Add file contents
    cat "$file" >> "$OUTPUT_FILE"
    
    # Close code block
    echo -e "\`\`\`\n" >> "$OUTPUT_FILE"
    
    echo "Added $file"
  done
}

# Process all files
process_files

# Add instructions for AI
cat >> "$OUTPUT_FILE" << 'EOF'

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
EOF

echo "Project analysis complete. Output saved to $OUTPUT_FILE"
echo "The file has been saved to your Downloads folder."