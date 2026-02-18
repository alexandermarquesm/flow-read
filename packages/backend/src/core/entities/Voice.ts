export interface Voice {
  id: string;
  name: string;
  languageCode: string;
  gender: "MALE" | "FEMALE" | "NEUTRAL" | "SSML_VOICE_GENDER_UNSPECIFIED";
  provider: "google" | "edge" | "google-gemini"; // Extensible for other providers
}
