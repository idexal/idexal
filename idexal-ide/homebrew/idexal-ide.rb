# typed: false
# frozen_string_literal: true

# Idexal IDE — Professional Multi-Agent AI-Powered Desktop IDE
#
# Features:
#   - 86 IDE panels (editor, terminal, git, database, Docker, K8s, etc.)
#   - 48 AI slash commands for coding, review, debugging, testing, and deployment
#   - 20 AI-powered tools for reading, writing, editing, and searching files
#   - Multi-model support (OpenAI, Anthropic, Ollama, custom providers)
#   - Real-time CRDT collaboration
#   - Plugin/extension system
#   - Cross-platform (Windows, macOS, Linux)
#
# This cask is auto-updated by GitHub Actions when a new release is tagged.
# To install manually:
#   brew install --cask idexal-ide
#
# To update:
#   brew upgrade --cask idexal-ide

cask "idexal-ide" do
  arch arm: "arm64", intel: "x64"

  version "1.0.0"
  sha256 arm:   "PLACEHOLDER_ARM64_SHA256",
         intel: "PLACEHOLDER_X64_SHA256"

  on_arm do
    url "https://github.com/idexal/idexal-ide/releases/download/v#{version}/Idexal-IDE-#{version}-macOS-universal.dmg"
  end
  on_intel do
    url "https://github.com/idexal/idexal-ide/releases/download/v#{version}/Idexal-IDE-#{version}-macOS-universal.dmg"
  end

  name "Idexal IDE"
  desc "Professional Multi-Agent AI-Powered Desktop IDE"
  homepage "https://idexal.com"

  livecheck do
    url "https://github.com/idexal/idexal-ide/releases/latest"
    regex(/Idexal[._-]IDE[._-]v?(\d+(?:\.\d+)+)\.dmg/i)
    strategy :header_match do |headers|
      match = headers["location"].match(/Idexal[._-]IDE[._-]v?(\d+(?:\.\d+)+)\.dmg/i)
      match[1] if match
    end
  end

  depends_on macos: ">= :big_sur"

  app "Idexal IDE.app"

  zap trash: [
    "~/Library/Application Support/Idexal IDE",
    "~/Library/Caches/Idexal IDE",
    "~/Library/Preferences/com.idexal.ide.plist",
    "~/Library/Saved Application State/com.idexal.ide.savedState",
    "~/Library/HTTPStorages/com.idexal.ide",
    "~/Library/WebKit/com.idexal.ide",
  ]
end
