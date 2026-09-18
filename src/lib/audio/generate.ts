import "server-only";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import sanitize from "sanitize-html";
import { splitSpeech } from "./chunks";
import { getAdminClient } from "@/lib/supabase/admin";
import { reserveBudget, providerOptions } from "@/lib/providers/budget";
import { digest } from "@/lib/v4/server";
export async function generateArticleAudio(postId: string) {
  const key = process.env.SARVAM_API_KEY,
    ffmpeg = process.env.FFMPEG_PATH,
    db = getAdminClient();
  if (!key || !ffmpeg || !db) throw Error("Audio not configured");
  const options = await providerOptions("tts");
  if (!options) throw Error("Audio disabled");
  const { data: post } = await db
    .from("posts")
    .select(
      "title_kn,body_html,audio_enabled,status,published_at,embargo_until,early_access_until",
    )
    .eq("id", postId)
    .single();
  if (
    !post ||
    post.status !== "published" ||
    Date.parse(post.published_at) > Date.now() ||
    (post.embargo_until && Date.parse(post.embargo_until) > Date.now()) ||
    (post.early_access_until &&
      Date.parse(post.early_access_until) > Date.now()) ||
    !post.audio_enabled
  )
    return;
  const text = sanitize(post.title_kn + ". " + post.body_html, {
      allowedTags: [],
      allowedAttributes: {},
    }),
    voice = z
      .string()
      .regex(/^[a-z]+$/)
      .catch("shubh")
      .parse(options.voice),
    pace = z.number().min(0.5).max(2).catch(1).parse(options.pace),
    hash = digest(text + voice + pace);
  const { data: cached } = await db
    .from("post_audio")
    .select("status,text_hash")
    .eq("post_id", postId)
    .maybeSingle();
  if (cached?.status === "ready" && cached.text_hash === hash) return;
  const chunks = splitSpeech(text);
  if (chunks.length > 40) throw Error("Article too long for audio");
  await reserveBudget("tts", Array.from(text).length);
  const deadline = Date.now() + 210000;
  const directory = await mkdtemp(join(tmpdir(), "jwalamala-audio-"));
  try {
    await db
      .from("post_audio")
      .upsert(
        { post_id: postId, status: "pending", text_hash: hash, voice, pace },
        { onConflict: "post_id" },
      );
    for (let i = 0; i < chunks.length; i++) {
      if (Date.now() >= deadline)
        throw Error("Audio generation deadline reached");
      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: chunks[i],
          language_code: "kn-IN",
          model: "bulbul:v3",
          speaker: voice,
          pace,
          output_audio_codec: "wav",
          speech_sample_rate: 24000,
        }),
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(45000, deadline - Date.now())),
        ),
      });
      if (!response.ok) throw Error("Speech provider failed");
      const audio = z
        .object({ audios: z.array(z.string().max(20000000)).min(1) })
        .parse(await response.json());
      await writeFile(
        join(directory, i + ".wav"),
        Buffer.from(audio.audios[0], "base64"),
      );
    }
    await writeFile(
      join(directory, "concat.txt"),
      chunks.map((_, i) => "file '" + i + ".wav'").join("\n"),
    );
    await promisify(execFile)(
      ffmpeg,
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "1",
        "-i",
        join(directory, "concat.txt"),
        "-ac",
        "1",
        "-ar",
        "24000",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "64k",
        join(directory, "article.mp3"),
      ],
      {
        timeout: Math.max(1, Math.min(45000, deadline - Date.now())),
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
    );
    const audio = await readFile(join(directory, "article.mp3")),
      path = postId + "/" + hash + ".mp3";
    if (audio.length > 20 * 1024 * 1024) throw Error("Audio file too large");
    const { data: latest } = await db
      .from("posts")
      .select("title_kn,body_html,status,embargo_until,early_access_until")
      .eq("id", postId)
      .single();
    if (
      !latest ||
      latest.status !== "published" ||
      (latest.embargo_until && Date.parse(latest.embargo_until) > Date.now()) ||
      (latest.early_access_until &&
        Date.parse(latest.early_access_until) > Date.now()) ||
      digest(
        sanitize(latest.title_kn + ". " + latest.body_html, {
          allowedTags: [],
          allowedAttributes: {},
        }) +
          voice +
          pace,
      ) !== hash
    )
      throw Error("Article changed during generation");
    const { error: uploadError } = await db.storage
      .from("article-audio")
      .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl },
    } = db.storage.from("article-audio").getPublicUrl(path);
    const { error } = await db.from("post_audio").upsert(
      {
        post_id: postId,
        status: "ready",
        text_hash: hash,
        voice,
        pace,
        audio_url: publicUrl,
        chars_used: Array.from(text).length,
        error: null,
      },
      { onConflict: "post_id" },
    );
    if (error) throw error;
  } catch (error) {
    await db.from("post_audio").upsert(
      {
        post_id: postId,
        status: "failed",
        text_hash: hash,
        error: "Generation failed; check provider configuration",
      },
      { onConflict: "post_id" },
    );
    throw error;
  } finally {
    const target = resolve(directory),
      base = resolve(tmpdir());
    if (target.startsWith(base + "\\") || target.startsWith(base + "/"))
      await rm(target, { recursive: true, force: true });
  }
}
