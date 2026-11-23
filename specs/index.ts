import type { Spec } from "../factory/spec/define.ts";
import { conversation } from "./conversation.ts";
import { features, owner } from "./features.ts";
import { message, messageMark } from "./message.ts";
import { contents, rules } from "./rules.ts";
import { connection, deskScreen, visitorScreen } from "./screens.ts";

export const spec: Spec = { features, owner, rules, contents, flows: [conversation, message, messageMark, connection, visitorScreen, deskScreen] };