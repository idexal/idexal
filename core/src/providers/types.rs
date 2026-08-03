// Idexal Core — unified provider types
//
// One message/tool vocabulary that both the Anthropic Messages API and the
// OpenAI /chat/completions format are translated to and from, so the agent
// loop (chat.rs) never has to know which vendor it is talking to.
// Ported from reference/ai-core-node-reference/src/providers/types.ts.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    /// JSON-encoded arguments object.
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
    /// Tool calls requested by the assistant in this turn.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tool_calls: Vec<ToolCall>,
    /// Set when this message carries a tool result back to the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

impl Message {
    pub fn user(content: impl Into<String>) -> Self {
        Self { role: Role::User, content: content.into(), tool_calls: Vec::new(), tool_call_id: None }
    }
    pub fn assistant(content: impl Into<String>, tool_calls: Vec<ToolCall>) -> Self {
        Self { role: Role::Assistant, content: content.into(), tool_calls, tool_call_id: None }
    }
    /// A tool result is sent back as a user-role message carrying the id of
    /// the call it answers; each provider adapter maps it to that vendor's
    /// own shape (Anthropic tool_result block / OpenAI role:"tool").
    pub fn tool_result(id: impl Into<String>, content: impl Into<String>) -> Self {
        Self {
            role: Role::User,
            content: content.into(),
            tool_calls: Vec::new(),
            tool_call_id: Some(id.into()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    /// JSON Schema for the tool's input object.
    pub input_schema: serde_json::Value,
}

/// One streamed event from a provider. Only text streams incrementally;
/// completed tool calls are returned in the `Turn` rather than streamed,
/// because a half-assembled call has no useful meaning to a caller.
#[derive(Debug, Clone)]
pub enum Delta {
    Text(String),
}

/// The result of one non-streaming or fully-consumed streaming turn.
#[derive(Debug, Clone, Default)]
pub struct Turn {
    pub text: String,
    pub tool_calls: Vec<ToolCall>,
}
