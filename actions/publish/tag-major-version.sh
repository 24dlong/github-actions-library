#!/bin/bash

# Function to get the latest major version tag (e.g., 1.*, 2.*, etc.)
get_latest_major_tag() {
  major=$1
  latest_tag=$(git tag --list "${major}.*" --sort=-version:refname | head -n 1)
  echo "$latest_tag"
}

# Function to update or create a major version tag
update_major_tag() {
  major=$1
  latest_tag=$(get_latest_major_tag "$major")

  if [ -n "$latest_tag" ]; then
    echo "Updating 'v$major' tag to point to $latest_tag"
    git tag -f "v$major" "$latest_tag"
    git push --force origin "v$major"
  else
    echo "No valid $major.* tags found."
  fi
}

# Get version tags that start with a number, sorted newest first using version sort
major_tags=$(git tag --list '[0-9]*' --sort=-version:refname)
echo "Major version tags: $major_tags"

# Pick the latest version tag
latest_major_version=$(echo "$major_tags" | head -n 1)
echo "Latest major version: $latest_major_version"

if [ -n "$latest_major_version" ]; then
  major_version=$(echo "$latest_major_version" | cut -d '.' -f 1)  # Extract '1', '2', etc.
  update_major_tag "$major_version"
else
  echo "No version tags found."
fi
