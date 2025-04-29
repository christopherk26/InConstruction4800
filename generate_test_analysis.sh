#!/bin/bash

# Output file - save to user's Downloads folder
DOWNLOADS_DIR="$HOME/Downloads"
OUTPUT_FILE="$DOWNLOADS_DIR/AIpromptFORtestingAnalysis.md"

# Create Downloads directory if it doesn't exist
mkdir -p "$DOWNLOADS_DIR"

# Create new file with header focused on testing and Jest config
cat > "$OUTPUT_FILE" << 'EOF'
# Project Testing and Jest Configuration Analysis for AI Code Assistance

I'm working on a group project and need help understanding our testing setup, specifically using Jest and React Testing Library with Next.js and Firebase mocking, as well as our Jest configuration. Below is a comprehensive overview including the project structure and the contents of our test and Jest configuration files.

## Project Structure Overview
(Note: This tree shows the overall project structure. The "Test and Jest File Contents" section below is filtered to only include test and Jest configuration/setup files.)


## Test and Jest File Contents
Below are the contents of test files and Jest configuration/setup files found in the project:

EOF

# Function to process ONLY test files and Jest config/setup files
# Note: This function is defined here but called later, similar to your example's process_files function.
process_test_and_jest_files() {
  # Find files matching common test patterns or located in __tests__ directories,
  # OR Jest config/setup files
  find . -type f \( \
      -name "*.test.ts" -o -name "*.test.tsx" -o \
      -name "*.spec.ts" -o -name "*.spec.tsx" -o \
      -path "*/__tests__/*" -o \
      -name "jest.config.js" -o -name "jest.config.ts" -o \
      -name "jest.setup.js" -o -name "jest.setup.ts" \
    \) \
    -not -path "*/node_modules/*" -not -path "*/\.*" -not -path "*/icons/*" \
    -not -path "*/dist/*" -not -path "*/build/*" | sort | while read -r file; do

    # Add file header with path
    echo -e "\n### File: $file\n" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"

    # Add file contents
    cat "$file" >> "$OUTPUT_FILE"

    # Close code block
    echo -e "\`\`\`\n" >> "$OUTPUT_FILE"

    echo "Added test/Jest file: $file"
  done
}

# Process only test and Jest files by calling the function
process_test_and_jest_files

# Add instructions for AI
cat >> "$OUTPUT_FILE" << 'EOF'

## Instructions for AI

Based on the project structure overview and the contents of the test and Jest configuration files provided above:

1. Please explain the overall testing strategy and setup used in this project.
2. Describe the key testing tools and libraries being used (Jest, React Testing Library) and how they are applied.
3. Explain how the Jest configuration (`jest.config.js/ts`, `jest.setup.js/ts`) is setting up the testing environment, including handling module aliases, mocks, and environment variables.
4. Explain the mocking strategies employed in the tests, particularly for Next.js navigation hooks (`useRouter`, `useSearchParams`) and Firebase services (Auth, Firestore, Storage). How are these external dependencies handled to enable isolated unit tests?
5. Analyze the structure and patterns observed in the test files. Are there consistent approaches to testing different types of components or logic (e.g., pages, components interacting with services)?
6. Identify any potential areas for improvement or common pitfalls in the current testing setup or Jest configuration based on best practices.
7. Please ask the user what specific aspects of the testing setup or configuration they would like to discuss further or if they have any questions about the analysis.

Our tech stack for testing primarily involves Jest as the test runner and React Testing Library for testing React components in a way that simulates user interaction. We are using Next.js with the App Router and Firebase for backend services. Mocking is crucial to isolate component tests from external dependencies like Next.js navigation and Firebase SDK calls.

Please ask the user what specific aspects of the testing setup or configuration they would like to discuss further or if they have any questions.

Thank you for your assistance!
EOF

echo "Project analysis complete. Output saved to $OUTPUT_FILE"
echo "The file has been saved to your Downloads folder."