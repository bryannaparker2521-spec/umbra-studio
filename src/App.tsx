import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import StudioUpdateCenter from "./StudioUpdateCenter";
import { getVersion } from "@tauri-apps/api/app";
import "./App.css";

type StudioPage = "dashboard" | "create" | "characters" | "library" | "profile" | "connections" | "world" | "explorer" | "admin" | "database" | "canon" | "production" | "settings" | "messages" | "transfer";

type CharacterRelationship = {
  id: string;
  source_character_id: string;
  target_character_id: string;
  relationship_type: string;
  target?: StudioCharacterRow | null;
};

type WorldRecord = {
  id: string;
  user_id: string;
  record_type: "realm" | "race" | "faction" | "family";
  name: string;
  subtype: string | null;
  description: string | null;
  emblem_url: string | null;
  cover_url?: string | null;
  lore_details?: Record<string, string> | null;
  is_public: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type WorldRelation = {
  id: string;
  source_record_id: string;
  target_record_id: string;
  relation_label: string | null;
  target?: WorldRecord | null;
};



type WorldLocation = {
  id: string; user_id: string; name: string; location_type: string; description: string | null;
  parent_location_id: string | null; codex_record_id: string | null; map_x: number | null; map_y: number | null;
  image_url: string | null; tags: string[] | null; is_public: boolean; archived_at?: string | null; created_at?: string | null; updated_at?: string | null;
};

type TimelineEvent = {
  id: string; user_id: string; title: string; era: string | null; display_date: string | null; sort_order: number;
  description: string | null; location_id: string | null; codex_record_id: string | null; character_id: string | null;
  image_url: string | null; tags: string[] | null; is_public: boolean; archived_at?: string | null; created_at?: string | null; updated_at?: string | null;
};

type WorldAtlas = { id: string; user_id: string; title: string; map_url: string | null; description: string | null; is_public: boolean; };

type StudioAdminMember = { user_id:string; email:string|null; display_name:string|null; role:"primary_admin"|"admin"|"editor"; created_at:string; last_login_at?:string|null; last_seen_at?:string|null; };
type CollaboratorSession = { id:string; user_id:string; display_name:string|null; email:string|null; role:string|null; signed_in_at:string; last_seen_at:string; signed_out_at:string|null; };
type CanonHistory = { id:string; entity_type:string; entity_id:string; entity_label:string|null; previous_status:string|null; new_status:string; reason:string|null; changed_by:string|null; changed_by_name:string|null; created_at:string; };
type ContinuityIssue = { id:string; issue_type:string; severity:"info"|"warning"|"critical"; entity_type:string; entity_id:string|null; entity_label:string|null; message:string; details:Record<string,any>; status:string; created_at:string; updated_at:string; };
type PublicSettings = { id:boolean; title:string; subtitle:string|null; introduction:string|null; hero_image_url:string|null; is_enabled:boolean; updated_at:string; };
type StoryProject = { id:string; title:string; project_type:string; summary:string|null; status:string; canon_status:string; spoiler_level:string; is_public:boolean; cover_url:string|null; created_by:string|null; updated_at:string; };
type StoryArc = { id:string; project_id:string|null; title:string; arc_code:string|null; summary:string|null; sort_order:number; status:string; canon_status:string; spoiler_level:string; updated_at:string; };
type StoryScene = { id:string; project_id:string|null; arc_id:string|null; title:string; scene_code:string|null; summary:string|null; body_notes:string|null; pov_character_id:string|null; location_id:string|null; timeline_event_id:string|null; era:string|null; story_date:string|null; sort_order:number; status:string; spoiler_level:string; updated_at:string; };
type StoryBeat = { id:string; project_id:string|null; arc_id:string|null; scene_id:string|null; title:string; description:string|null; beat_type:string; status:string; sort_order:number; updated_at:string; };
type StoryEntityLink = { id:string; story_entity_type:string; story_entity_id:string; linked_entity_type:string; linked_entity_id:string; relation_label:string|null; notes:string|null; created_at:string; };
type ReviewComment = { id:string; entity_type:string; entity_id:string; body:string; status:string; created_by:string|null; created_by_name:string|null; created_at:string; resolved_at:string|null; };
type StudioAssignment = { id:string; title:string; description:string|null; entity_type:string|null; entity_id:string|null; assigned_to:string; assigned_by:string|null; priority:string; status:string; due_at:string|null; created_at:string; updated_at:string; };
type StudioNotification = { id:string; recipient_user_id:string; actor_user_id:string|null; actor_name:string|null; notification_type:string; title:string; message:string|null; entity_type:string|null; entity_id:string|null; is_read:boolean; created_at:string; };
type StudioDirectMessage = { id:string; sender_user_id:string; recipient_user_id:string; body:string; entity_type:string|null; entity_id:string|null; read_at:string|null; created_at:string; };
type CharacterJourney = { id:string; character_id:string; project_id:string|null; arc_id:string|null; scene_id:string|null; journey_type:string; title:string; description:string|null; before_value:string|null; after_value:string|null; sort_order:number; created_at:string; };
type V9Health = { projects:number; arcs:number; scenes:number; beats:number; open_comments:number; open_assignments:number; my_unread_notifications:number; continuity_open:number; };
type StudioSettings = { id:boolean; studio_name:string; studio_subtitle:string; default_canon_status:string; default_spoiler_level:string; autosave_enabled:boolean; autosave_seconds:number; stale_session_minutes:number; show_dashboard_activity:boolean; updated_at:string; };
type ChangeSinceVisit = { id:string; actor_user_id:string|null; actor_name:string; action:string; entity_type:string; entity_id:string|null; entity_label:string|null; details:Record<string,any>|null; created_at:string; };
type StudioActivity = { id:string; actor_user_id:string|null; actor_email:string|null; action:string; entity_type:string; entity_id:string|null; entity_label:string|null; details:Record<string,any>|null; created_at:string; };
type StudioRevision = { id:string; entity_type:string; entity_id:string; entity_label:string|null; changed_by:string|null; changed_by_email:string|null; snapshot:Record<string,any>; created_at:string; };
type StudioNote = { id:string; entity_type:string; entity_id:string; note:string; created_by:string; created_by_email:string|null; created_at:string; updated_at:string; };
type AdminContentRow = { id:string; entity_type:"character"|"codex"|"location"|"timeline"; label:string; workflow_status:string; user_id:string; updated_at:string|null; };


type StudioRecordType = { id:string; slug:string; name:string; description:string|null; icon:string|null; is_system:boolean; };
type StudioDatabaseRecord = { id:string; created_by:string; updated_by:string|null; record_type_id:string; record_code:string; name:string; subtitle:string|null; summary:string|null; details:Record<string,any>; image_url:string|null; notes?:string|null; last_reviewed_at?:string|null; workflow_status:string; canon_status?:string; canon_notes?:string|null; is_public?:boolean; public_slug?:string|null; canon_updated_at?:string|null; archived_at:string|null; created_at:string; updated_at:string; };
type StudioCollectionItem = { id:string; collection_id:string; entity_type:string; entity_id:string; created_at:string; };
type StudioTagAssignment = { id:string; tag_id:string; entity_type:string; entity_id:string; created_at:string; };
type DatabaseHealth = { active_records:number; archived_records:number; draft_records:number; review_records:number; records_without_summary:number; records_without_image:number; collections:number; tags:number; links:number; media:number; };
type StudioCollection = { id:string; name:string; description:string|null; created_by:string; created_at:string; };
type StudioTag = { id:string; name:string; created_at:string; };
type StudioUniversalLink = { id:string; source_type:string; source_id:string; target_type:string; target_id:string; relation_label:string; notes:string|null; created_at:string; };
type StudioMediaAsset = { id:string; uploaded_by:string; title:string; asset_url:string; media_type:string; caption:string|null; credit:string|null; alt_text:string|null; tags:string[]; created_at:string; updated_at:string; };
type StudioBackup = { id:string; created_by:string; label:string; snapshot:Record<string,any>; created_at:string; };
type DatabaseRevision = { id:string; record_id:string; record_code:string|null; record_name:string|null; changed_by:string|null; changed_by_email:string|null; snapshot:Record<string,any>; created_at:string; };
type DatabaseLock = { record_id:string; locked_by:string; locked_by_email:string|null; locked_at:string; expires_at:string; };
type FieldTemplate = { id:string; record_type_id:string; name:string; fields:Array<{key:string;label:string;placeholder?:string}>; created_by:string; created_at:string; updated_at:string; };
type MediaAttachment = { id:string; media_id:string; entity_type:string; entity_id:string; caption_override:string|null; created_at:string; };
type RecordReference = { id:string; record_id:string; label:string; reference_type:string; url:string|null; citation:string|null; notes:string|null; created_by:string; created_at:string; };

type StudioCharacterRow = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  identity: Record<string, string> | null;
  appearance: Record<string, string> | null;
  origin_lore: Record<string, string> | null;
  abilities: Record<string, string> | null;
  relationships: Record<string, string> | null;
  media: Record<string, any> | null;
  portrait_url: string | null;
  current_step: number | null;
  is_complete: boolean | null;
  is_public: boolean | null;
  realm_record_id?: string | null;
  race_record_id?: string | null;
  faction_record_id?: string | null;
  family_record_id?: string | null;
  updated_at?: string | null;
};

function App() {
const [session, setSession] = useState<Session | null>(null);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(true);
const [signingIn, setSigningIn] = useState(false);
const [error, setError] = useState("");
const [page, setPage] = useState<StudioPage>("dashboard");
const [creatorStep, setCreatorStep] = useState(1);
const [studioCharacterId, setStudioCharacterId] = useState<string | null>(null);
const [savingCharacter, setSavingCharacter] = useState(false);
const [saveError, setSaveError] = useState("");
const [studioCharacters, setStudioCharacters] = useState<StudioCharacterRow[]>([]);
const [loadingCharacters, setLoadingCharacters] = useState(false);
const [charactersError, setCharactersError] = useState("");
const [libraryCharacters, setLibraryCharacters] = useState<StudioCharacterRow[]>([]);
const [loadingLibrary, setLoadingLibrary] = useState(false);
const [libraryError, setLibraryError] = useState("");
const [selectedCharacter, setSelectedCharacter] = useState<StudioCharacterRow | null>(null);
const [profileReturnPage, setProfileReturnPage] = useState<"characters" | "library">("library");
const [librarySearch, setLibrarySearch] = useState("");
const [libraryRace, setLibraryRace] = useState("");
const [libraryHomeland, setLibraryHomeland] = useState("");
const [libraryAffiliation, setLibraryAffiliation] = useState("");
const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
const [mediaUploadError, setMediaUploadError] = useState("");
const [relationshipOptions, setRelationshipOptions] = useState<StudioCharacterRow[]>([]);
const [connectedRelationships, setConnectedRelationships] = useState<CharacterRelationship[]>([]);
const [relationshipTargetId, setRelationshipTargetId] = useState("");
const [relationshipType, setRelationshipType] = useState("sibling");
const [relationshipBusy, setRelationshipBusy] = useState(false);
const [relationshipError, setRelationshipError] = useState("");
const [connectionView, setConnectionView] = useState<"family" | "all">("family");
const [connectionCenter, setConnectionCenter] = useState<StudioCharacterRow | null>(null);
const [connectionLinks, setConnectionLinks] = useState<CharacterRelationship[]>([]);
const [loadingConnections, setLoadingConnections] = useState(false);
const [worldRecords, setWorldRecords] = useState<WorldRecord[]>([]);
const [loadingWorld, setLoadingWorld] = useState(false);
const [worldError, setWorldError] = useState("");
const [worldTypeFilter, setWorldTypeFilter] = useState<"all" | "realm" | "race" | "faction" | "family">("all");
const [worldSearch, setWorldSearch] = useState("");
const [worldFormType, setWorldFormType] = useState<"realm" | "race" | "faction" | "family">("realm");
const [worldFormName, setWorldFormName] = useState("");
const [worldFormSubtype, setWorldFormSubtype] = useState("");
const [worldFormDescription, setWorldFormDescription] = useState("");
const [worldSaving, setWorldSaving] = useState(false);
const [selectedWorldRecord, setSelectedWorldRecord] = useState<WorldRecord | null>(null);
const [linkedRealmId, setLinkedRealmId] = useState("");
const [linkedRaceId, setLinkedRaceId] = useState("");
const [linkedFactionId, setLinkedFactionId] = useState("");
const [linkedFamilyId, setLinkedFamilyId] = useState("");
const [worldEditName, setWorldEditName] = useState("");
const [worldEditSubtype, setWorldEditSubtype] = useState("");
const [worldEditDescription, setWorldEditDescription] = useState("");
const [worldEditLore, setWorldEditLore] = useState({ history:"", culture:"", geography:"", magic:"", government:"", notes:"" });
const [worldEditCoverUrl, setWorldEditCoverUrl] = useState("");
const [worldEditEmblemUrl, setWorldEditEmblemUrl] = useState("");
const [worldRelated, setWorldRelated] = useState<WorldRelation[]>([]);
const [worldRelatedTargetId, setWorldRelatedTargetId] = useState("");
const [worldRelatedLabel, setWorldRelatedLabel] = useState("");
const [worldDetailBusy, setWorldDetailBusy] = useState(false);
const [uploadingWorldMedia, setUploadingWorldMedia] = useState<"cover" | "emblem" | null>(null);
const [atlas, setAtlas] = useState<WorldAtlas | null>(null);
const [worldLocations, setWorldLocations] = useState<WorldLocation[]>([]);
const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
const [explorerTab, setExplorerTab] = useState<"map" | "locations" | "timeline" | "favorites" | "archive">("map");
const [explorerSearch, setExplorerSearch] = useState("");
const [selectedLocationId, setSelectedLocationId] = useState("");
const [locationForm, setLocationForm] = useState({ name:"", locationType:"realm", description:"", parentId:"", codexId:"", mapX:"50", mapY:"50", tags:"" });
const [eventForm, setEventForm] = useState({ title:"", era:"", displayDate:"", sortOrder:"0", description:"", locationId:"", codexId:"", characterId:"", tags:"" });
const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
const [explorerBusy, setExplorerBusy] = useState(false);
const [explorerError, setExplorerError] = useState("");
const [uploadingMap, setUploadingMap] = useState(false);
const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
const [editingEventId, setEditingEventId] = useState<string | null>(null);
const [draggingLocationId, setDraggingLocationId] = useState<string | null>(null);
const [studioSearch, setStudioSearch] = useState("");
const [adminMembers,setAdminMembers]=useState<StudioAdminMember[]>([]);
const [adminRole,setAdminRole]=useState<StudioAdminMember["role"]|null>(null);
const [adminActivity,setAdminActivity]=useState<StudioActivity[]>([]);
const [adminRevisions,setAdminRevisions]=useState<StudioRevision[]>([]);
const [adminNotes,setAdminNotes]=useState<StudioNote[]>([]);
const [adminContent,setAdminContent]=useState<AdminContentRow[]>([]);
const [adminTab,setAdminTab]=useState<"overview"|"content"|"activity"|"sessions"|"revisions"|"notes"|"team">("overview");
const [adminBusy,setAdminBusy]=useState(false);
const [adminError,setAdminError]=useState("");
const [adminMemberEmail,setAdminMemberEmail]=useState("");
const [adminMemberRole,setAdminMemberRole]=useState<StudioAdminMember["role"]>("editor");
const [studioAccessChecked,setStudioAccessChecked]=useState(false);
const [studioAccessRole,setStudioAccessRole]=useState<StudioAdminMember["role"]|null>(null);
const [adminNoteText,setAdminNoteText]=useState("");
const [adminNoteEntityType,setAdminNoteEntityType]=useState("general");
const [adminNoteEntityId,setAdminNoteEntityId]=useState("studio");

const [databaseTab,setDatabaseTab]=useState<"records"|"canon"|"continuity"|"encyclopedia"|"collections"|"tags"|"links"|"media"|"bulk"|"health"|"backup"|"revisions"|"duplicates"|"templates"|"import">("records");
const [recordTypes,setRecordTypes]=useState<StudioRecordType[]>([]);
const [databaseRecords,setDatabaseRecords]=useState<StudioDatabaseRecord[]>([]);
const [collections,setCollections]=useState<StudioCollection[]>([]);
const [studioTags,setStudioTags]=useState<StudioTag[]>([]);
const [universalLinks,setUniversalLinks]=useState<StudioUniversalLink[]>([]);
const [mediaAssets,setMediaAssets]=useState<StudioMediaAsset[]>([]);
const [backups,setBackups]=useState<StudioBackup[]>([]);
const [databaseBusy,setDatabaseBusy]=useState(false);
const [databaseError,setDatabaseError]=useState("");
const [databaseSearch,setDatabaseSearch]=useState("");
const [databaseTypeFilter,setDatabaseTypeFilter]=useState("all");
const [recordForm,setRecordForm]=useState({typeId:"",name:"",subtitle:"",summary:""});
const [collectionForm,setCollectionForm]=useState({name:"",description:""});
const [tagName,setTagName]=useState("");
const [customTypeForm,setCustomTypeForm]=useState({name:"",slug:"",description:""});
const [collectionItems,setCollectionItems]=useState<StudioCollectionItem[]>([]);
const [tagAssignments,setTagAssignments]=useState<StudioTagAssignment[]>([]);
const [selectedDatabaseRecordId,setSelectedDatabaseRecordId]=useState<string|null>(null);
const [selectedDatabaseRecordIds,setSelectedDatabaseRecordIds]=useState<Set<string>>(new Set());
const [recordEditor,setRecordEditor]=useState({name:"",subtitle:"",summary:"",imageUrl:"",notes:"",workflowStatus:"draft",detailsText:"{}"});
const [linkForm,setLinkForm]=useState({sourceId:"",targetType:"database",targetId:"",label:"",notes:""});
const [assignmentCollectionId,setAssignmentCollectionId]=useState("");
const [assignmentTagId,setAssignmentTagId]=useState("");
const [mediaForm,setMediaForm]=useState({title:"",assetUrl:"",mediaType:"image",caption:"",credit:"",altText:"",tags:""});
const [backupLabel,setBackupLabel]=useState("");
const [databaseHealth,setDatabaseHealth]=useState<DatabaseHealth|null>(null);
const [databaseRevisions,setDatabaseRevisions]=useState<DatabaseRevision[]>([]);
const [databaseLocks,setDatabaseLocks]=useState<DatabaseLock[]>([]);
const [fieldTemplates,setFieldTemplates]=useState<FieldTemplate[]>([]);
const [mediaAttachments,setMediaAttachments]=useState<MediaAttachment[]>([]);
const [templateForm,setTemplateForm]=useState({recordTypeId:"",name:"",fieldsText:'[{"key":"overview","label":"Overview"}]'});
const [importText,setImportText]=useState("");
const [importPreview,setImportPreview]=useState<any[]>([]);
const [importError,setImportError]=useState("");
const [characterImportPreview,setCharacterImportPreview]=useState<any|null>(null);

const [recordMediaId,setRecordMediaId]=useState("");
const [recordReferences,setRecordReferences]=useState<RecordReference[]>([]);
const [referenceForm,setReferenceForm]=useState({label:"",referenceType:"source",url:"",citation:"",notes:""});
const [recordEditorMode,setRecordEditorMode]=useState<"visual"|"json">("visual");
const [recordVisualDetails,setRecordVisualDetails]=useState<Array<{key:string;value:string}>>([]);
const [newDetailField,setNewDetailField]=useState({key:"",value:""});
const [autosaveStatus,setAutosaveStatus]=useState("");
const [collaboratorSessions,setCollaboratorSessions]=useState<CollaboratorSession[]>([]);
const [activeStudioSessionId,setActiveStudioSessionId]=useState<string|null>(null);
const [myStudioDisplayName,setMyStudioDisplayName]=useState("");
const [canonHistory,setCanonHistory]=useState<CanonHistory[]>([]);
const [continuityIssues,setContinuityIssues]=useState<ContinuityIssue[]>([]);
const [publicSettings,setPublicSettings]=useState<PublicSettings|null>(null);
const [canonReason,setCanonReason]=useState("");
const [canonSearch,setCanonSearch]=useState("");
const [canonFilter,setCanonFilter]=useState("all");
const [publicBrowse,setPublicBrowse]=useState(false);
const [publicBrowseRecords,setPublicBrowseRecords]=useState<StudioDatabaseRecord[]>([]);
const [publicBrowseTypes,setPublicBrowseTypes]=useState<StudioRecordType[]>([]);
const [publicBrowseSettings,setPublicBrowseSettings]=useState<PublicSettings|null>(null);
const [publicBrowseSearch,setPublicBrowseSearch]=useState("");
const [publicBrowseTab,setPublicBrowseTab]=useState<"lore"|"characters"|"codex"|"locations"|"timeline">("lore");
const [publicBrowseCharacters,setPublicBrowseCharacters]=useState<StudioCharacterRow[]>([]);
const [publicBrowseWorld,setPublicBrowseWorld]=useState<WorldRecord[]>([]);
const [publicBrowseLocations,setPublicBrowseLocations]=useState<WorldLocation[]>([]);
const [publicBrowseTimeline,setPublicBrowseTimeline]=useState<TimelineEvent[]>([]);
const [productionTab,setProductionTab]=useState<"overview"|"projects"|"arcs"|"scenes"|"plot"|"journeys"|"review"|"assignments"|"inbox"|"graph">("overview");
const [storyProjects,setStoryProjects]=useState<StoryProject[]>([]);
const [storyArcs,setStoryArcs]=useState<StoryArc[]>([]);
const [storyScenes,setStoryScenes]=useState<StoryScene[]>([]);
const [storyBeats,setStoryBeats]=useState<StoryBeat[]>([]);
const [storyLinks,setStoryLinks]=useState<StoryEntityLink[]>([]);
const [reviewComments,setReviewComments]=useState<ReviewComment[]>([]);
const [studioAssignments,setStudioAssignments]=useState<StudioAssignment[]>([]);
const [studioNotifications,setStudioNotifications]=useState<StudioNotification[]>([]);
const [characterJourney,setCharacterJourney]=useState<CharacterJourney[]>([]);
const [changesSinceVisit,setChangesSinceVisit]=useState<ChangeSinceVisit[]>([]);
const [v9Health,setV9Health]=useState<V9Health|null>(null);
const [productionBusy,setProductionBusy]=useState(false);
const [productionError,setProductionError]=useState("");
const [studioSettings,setStudioSettings]=useState<StudioSettings|null>(null);
const [settingsError,setSettingsError]=useState("");
const [settingsBusy,setSettingsBusy]=useState(false);
const [appVersion,setAppVersion]=useState("...");
const [directMessages,setDirectMessages]=useState<StudioDirectMessage[]>([]);
const [messageRecipientId,setMessageRecipientId]=useState("");
const [messageBody,setMessageBody]=useState("");
const [messagesBusy,setMessagesBusy]=useState(false);
const [messagesError,setMessagesError]=useState("");
const [backupValidation,setBackupValidation]=useState<{ok:boolean;message:string;summary?:string}|null>(null);
const [productionSearch,setProductionSearch]=useState("");
const [projectForm,setProjectForm]=useState({title:"",projectType:"story",summary:"",status:"planning"});
const [arcForm,setArcForm]=useState({projectId:"",title:"",summary:"",status:"planned"});
const [sceneForm,setSceneForm]=useState({projectId:"",arcId:"",title:"",summary:"",povId:"",locationId:"",era:"",storyDate:"",status:"idea"});
const [beatForm,setBeatForm]=useState({projectId:"",arcId:"",sceneId:"",title:"",description:"",beatType:"plot",status:"idea"});
const [commentForm,setCommentForm]=useState({entityType:"story_project",entityId:"",body:"",notifyUserId:""});
const [assignmentForm,setAssignmentForm]=useState({title:"",description:"",entityType:"story_project",entityId:"",assignedTo:"",priority:"normal",dueAt:""});
const [journeyForm,setJourneyForm]=useState({characterId:"",projectId:"",arcId:"",sceneId:"",journeyType:"development",title:"",description:"",beforeValue:"",afterValue:""});

const [character, setCharacter] = useState({
  name: "",
  alias: "",
  nicknames: "",
  titles: "",
  pronunciation: "",
  nameMeaning: "",
  birthDate: "",
  elementalHeritage: "",
  canonStatus: "",
  spoilerLevel: "",
  era: "",
  age: "",
  apparentAge: "",
  pronouns: "",
  subrace: "",
  heritage: "",
  nationality: "",
  currentResidence: "",
  occupation: "",
  race: "",
  gender: "",
  homeland: "",
  affiliation: "",
  summary: "",
  skinTone: "",
  skinHex: "",
  faceDetails: "",
  eyeColor: "",
  eyeHex: "",
  hairColor: "",
  hairHex: "",
  hairTexture: "",
  hairStyle: "",
  height: "",
  weight: "",
  dominantHand: "",
  build: "",
  postureMovement: "",
  distinguishingFeatures: "",
  makeup: "",
  grooming: "",
  nails: "",
  colorPalette: "",
  signatureOutfit: "",
  outfitColors: "",
  outfitMaterials: "",
  wardrobe: "",
  clothingStyle: "",
  accessories: "",
  alternateForm: "",
  appearanceNotes: "",
  birthplace: "",
  lineage: "",
  culture: "",
  childhood: "",
  backstory: "",
  majorLifeEvents: "",
  personality: "",
  voiceSpeech: "",
  psychology: "",
  lifestyle: "",
  likesDislikes: "",
  motivations: "",
  goals: "",
  fears: "",
  beliefs: "",
  storyRole: "",
  storyArc: "",
  powerSource: "",
  primaryAbilities: "",
  secondaryAbilities: "",
  signatureTechniques: "",
  weapons: "",
  weaponDetails: "",
  transformations: "",
  transformationDetails: "",
  strengths: "",
  weaknesses: "",
  limitations: "",
  combatStyle: "",
  combatProfile: "",
  abilityNotes: "",
  parents: "",
  siblings: "",
  children: "",
  partner: "",
  allies: "",
  rivals: "",
  enemies: "",
  mentors: "",
  relationshipNotes: "",
  worldConnections: "",
  visualAssets: "",
  productionNotes: "",
  canonLocks: "",
  tbdFields: "",
  portraitUrl: "",
  referenceArtUrl: "",
  alternateFormUrl: "",
  galleryUrl: "",
  galleryUrls: [] as string[],
  mediaNotes: "",
});

useEffect(()=>{ getVersion().then(setAppVersion).catch(()=>setAppVersion("Unknown")); },[]);

useEffect(() => {
let mounted = true;

async function loadSession() {
  const { data } = await supabase.auth.getSession();

  if (mounted) {
    setSession(data.session);
    setLoading(false);
  }
}

loadSession();

const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((_event, newSession) => {
  if (mounted) {
    setSession(newSession);

    if (!newSession) {
      setPage("dashboard");
    }
  }
});

return () => {
  mounted = false;
  subscription.unsubscribe();
};

}, []);

useEffect(() => {
  let active = true;
  async function verifyStudioAccess() {
    if (!session?.user.id) { setStudioAccessChecked(false); setStudioAccessRole(null); return; }
    setStudioAccessChecked(false);
    const { data, error: accessError } = await supabase.rpc("studio_get_my_role");
    if (!active) return;
    const role = (!accessError && (data === "primary_admin" || data === "admin" || data === "editor")) ? data as StudioAdminMember["role"] : null;
    setStudioAccessRole(role);
    setAdminRole(role);
    setStudioAccessChecked(true);
    if (role) { void Promise.all([loadMyCharacters(), loadWorldRecords(), loadWorldExplorer(), loadV9Production(), loadStudioSettings()]); setTimeout(()=>void registerStudioSession(),0); }
  }
  void verifyStudioAccess();
  return () => { active = false; };
}, [session?.user.id]);

useEffect(()=>{if(!activeStudioSessionId)return;const timer=window.setInterval(()=>{void touchStudioSession();},60000);return()=>window.clearInterval(timer);},[activeStudioSessionId]);

useEffect(()=>{if(!selectedDatabaseRecordId||!studioSettings?.autosave_enabled)return;const timer=window.setTimeout(()=>{saveLocalRecoveryDraft();},Math.max(5,studioSettings.autosave_seconds||20)*1000);return()=>window.clearTimeout(timer);},[selectedDatabaseRecordId,recordEditor,recordVisualDetails,studioSettings?.autosave_enabled,studioSettings?.autosave_seconds]);

async function loadAdminCenter() {
  if (!session) return;
  setAdminBusy(true); setAdminError("");
  try {
    const [members,activity,revisions,notes,characters,codex,locations,events,sessions] = await Promise.all([
      supabase.from("studio_admin_members").select("user_id,email,display_name,role,created_at,last_login_at,last_seen_at").order("created_at"),
      supabase.from("studio_activity_log").select("id,actor_user_id,actor_email,action,entity_type,entity_id,entity_label,details,created_at").order("created_at",{ascending:false}).limit(100),
      supabase.from("studio_revisions").select("id,entity_type,entity_id,entity_label,changed_by,changed_by_email,snapshot,created_at").order("created_at",{ascending:false}).limit(100),
      supabase.from("studio_admin_notes").select("id,entity_type,entity_id,note,created_by,created_by_email,created_at,updated_at").order("updated_at",{ascending:false}).limit(100),
      supabase.from("studio_characters").select("id,user_id,name,workflow_status,updated_at"),
      supabase.from("studio_world_records").select("id,user_id,name,workflow_status,updated_at"),
      supabase.from("studio_world_locations").select("id,user_id,name,workflow_status,updated_at").is("archived_at",null),
      supabase.from("studio_timeline_events").select("id,user_id,title,workflow_status,updated_at").is("archived_at",null),
      supabase.from("studio_collaborator_sessions").select("*").order("signed_in_at",{ascending:false}).limit(200),
    ]);
    for (const result of [members,activity,revisions,notes,characters,codex,locations,events,sessions]) if (result.error) throw result.error;
    const memberRows=(members.data??[]) as StudioAdminMember[]; setAdminMembers(memberRows);
    setAdminRole(memberRows.find(x=>x.user_id===session.user.id)?.role??null);
    setCollaboratorSessions((sessions.data??[]) as CollaboratorSession[]); setAdminActivity((activity.data??[]) as StudioActivity[]); setAdminRevisions((revisions.data??[]) as StudioRevision[]); setAdminNotes((notes.data??[]) as StudioNote[]);
    setAdminContent([
      ...((characters.data??[]) as any[]).map(x=>({id:x.id,user_id:x.user_id,label:x.name,workflow_status:x.workflow_status||"draft",updated_at:x.updated_at,entity_type:"character" as const})),
      ...((codex.data??[]) as any[]).map(x=>({id:x.id,user_id:x.user_id,label:x.name,workflow_status:x.workflow_status||"draft",updated_at:x.updated_at,entity_type:"codex" as const})),
      ...((locations.data??[]) as any[]).map(x=>({id:x.id,user_id:x.user_id,label:x.name,workflow_status:x.workflow_status||"draft",updated_at:x.updated_at,entity_type:"location" as const})),
      ...((events.data??[]) as any[]).map(x=>({id:x.id,user_id:x.user_id,label:x.title,workflow_status:x.workflow_status||"draft",updated_at:x.updated_at,entity_type:"timeline" as const})),
    ]);
  } catch (failure) { setAdminError(failure instanceof Error?failure.message:"Admin Center could not be loaded."); }
  finally { setAdminBusy(false); }
}
async function openAdminCenter(tab:typeof adminTab="overview"){setAdminTab(tab);setPage("admin");window.scrollTo({top:0,behavior:"smooth"});await loadAdminCenter();}
async function addStudioAdmin(){if(!adminMemberEmail.trim()||adminBusy)return;setAdminBusy(true);setAdminError("");try{const {error}=await supabase.rpc("studio_add_admin_by_email",{member_email:adminMemberEmail.trim(),member_role:adminMemberRole});if(error)throw error;setAdminMemberEmail("");await loadAdminCenter();}catch(f){setAdminError(f instanceof Error?f.message:"Admin could not be added.");}finally{setAdminBusy(false);}}
async function changeAdminRole(userId:string,role:StudioAdminMember["role"]){setAdminError("");const {error}=await supabase.rpc("studio_change_admin_role",{member_user_id:userId,member_role:role});if(error)setAdminError(error.message);else await loadAdminCenter();}
async function removeStudioAdmin(userId:string){if(!confirm("Remove this collaborator from Umbra Studio?"))return;const {error}=await supabase.rpc("studio_remove_admin",{member_user_id:userId});if(error)setAdminError(error.message);else await loadAdminCenter();}
const adminTableFor=(type:AdminContentRow["entity_type"])=>type==="character"?"studio_characters":type==="codex"?"studio_world_records":type==="location"?"studio_world_locations":"studio_timeline_events";
async function setWorkflowStatus(row:AdminContentRow,status:string){const {error}=await supabase.from(adminTableFor(row.entity_type)).update({workflow_status:status,updated_at:new Date().toISOString()}).eq("id",row.id);if(error)setAdminError(error.message);else await loadAdminCenter();}
async function addAdminNote(){if(!session||!adminNoteText.trim())return;const {error}=await supabase.from("studio_admin_notes").insert({entity_type:adminNoteEntityType,entity_id:adminNoteEntityId||"studio",note:adminNoteText.trim(),created_by:session.user.id,created_by_email:session.user.email??null});if(error)setAdminError(error.message);else{setAdminNoteText("");await loadAdminCenter();}}
async function deleteAdminNote(id:string){const {error}=await supabase.from("studio_admin_notes").delete().eq("id",id);if(error)setAdminError(error.message);else await loadAdminCenter();}


async function loadWorldDatabase(){
  setDatabaseBusy(true); setDatabaseError("");
  try{
    const [types,records,cols,tags,links,media,backupRows,colItems,tagItems,health,revisions,locks,templates,attachments,references,canonRows,issuesRows,publicRows]=await Promise.all([
      supabase.from("studio_record_types").select("*").order("name"),
      supabase.from("studio_database_records").select("*").order("updated_at",{ascending:false}),
      supabase.from("studio_collections").select("*").order("name"),
      supabase.from("studio_tags").select("id,name,created_at").order("name"),
      supabase.from("studio_universal_links").select("*").order("created_at",{ascending:false}).limit(500),
      supabase.from("studio_media_assets").select("*").order("updated_at",{ascending:false}),
      supabase.from("studio_backup_snapshots").select("id,created_by,label,snapshot,created_at").order("created_at",{ascending:false}).limit(50),
      supabase.from("studio_collection_items").select("id,collection_id,entity_type,entity_id,created_at"),
      supabase.from("studio_tag_assignments").select("id,tag_id,entity_type,entity_id,created_at"),
      supabase.rpc("studio_database_health"),
      supabase.from("studio_database_revisions").select("*").order("created_at",{ascending:false}).limit(200),
      supabase.from("studio_database_locks").select("*"),
      supabase.from("studio_field_templates").select("*").order("name"),
      supabase.from("studio_media_attachments").select("*").order("created_at",{ascending:false}),
      supabase.from("studio_record_references").select("*").order("created_at",{ascending:false}),
      supabase.from("studio_canon_history").select("*").order("created_at",{ascending:false}).limit(300),
      supabase.from("studio_continuity_issues").select("*").order("created_at",{ascending:false}).limit(500),
      supabase.from("studio_public_settings").select("*").eq("id",true).maybeSingle()
    ]);
    for(const r of [types,records,cols,tags,links,media,backupRows,colItems,tagItems,revisions,locks,templates,attachments,references,canonRows,issuesRows]) if(r.error) throw r.error;
    setRecordTypes((types.data??[]) as StudioRecordType[]); setDatabaseRecords((records.data??[]) as StudioDatabaseRecord[]);
    setCollections((cols.data??[]) as StudioCollection[]); setStudioTags((tags.data??[]) as StudioTag[]); setUniversalLinks((links.data??[]) as StudioUniversalLink[]);
    setMediaAssets((media.data??[]) as StudioMediaAsset[]); setBackups((backupRows.data??[]) as StudioBackup[]);
    setCollectionItems((colItems.data??[]) as StudioCollectionItem[]); setTagAssignments((tagItems.data??[]) as StudioTagAssignment[]);
    if(!health.error) setDatabaseHealth(health.data as DatabaseHealth);
    setDatabaseRevisions((revisions.data??[]) as DatabaseRevision[]); setDatabaseLocks((locks.data??[]) as DatabaseLock[]);
    setFieldTemplates((templates.data??[]) as FieldTemplate[]); setMediaAttachments((attachments.data??[]) as MediaAttachment[]); setRecordReferences((references.data??[]) as RecordReference[]); setCanonHistory((canonRows.data??[]) as CanonHistory[]); setContinuityIssues((issuesRows.data??[]) as ContinuityIssue[]); if(!publicRows.error&&publicRows.data)setPublicSettings(publicRows.data as PublicSettings);
    if(!recordForm.typeId && types.data?.[0]?.id) setRecordForm(x=>({...x,typeId:types.data![0].id}));
  }catch(f){setDatabaseError(f instanceof Error?f.message:"World Database could not be loaded.");}finally{setDatabaseBusy(false);}
}
async function openWorldDatabase(tab:typeof databaseTab="records"){setDatabaseTab(tab);setPage("database");window.scrollTo({top:0,behavior:"smooth"});await loadWorldDatabase();}
async function createDatabaseRecord(){if(!session||!recordForm.typeId||!recordForm.name.trim())return;setDatabaseBusy(true);const {error}=await supabase.from("studio_database_records").insert({created_by:session.user.id,updated_by:session.user.id,record_type_id:recordForm.typeId,name:recordForm.name.trim(),subtitle:recordForm.subtitle.trim()||null,summary:recordForm.summary.trim()||null});if(error)setDatabaseError(error.message);else{setRecordForm(x=>({...x,name:"",subtitle:"",summary:""}));await loadWorldDatabase();}setDatabaseBusy(false);}
async function createCollection(){if(!session||!collectionForm.name.trim())return;const {error}=await supabase.from("studio_collections").insert({name:collectionForm.name.trim(),description:collectionForm.description.trim()||null,created_by:session.user.id});if(error)setDatabaseError(error.message);else{setCollectionForm({name:"",description:""});await loadWorldDatabase();}}
async function createTag(){if(!session||!tagName.trim())return;const {error}=await supabase.from("studio_tags").insert({name:tagName.trim(),created_by:session.user.id});if(error)setDatabaseError(error.message);else{setTagName("");await loadWorldDatabase();}}
async function createCustomType(){if(!session||adminRole!=="primary_admin"||!customTypeForm.name.trim()||!customTypeForm.slug.trim())return;const slug=customTypeForm.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");const {error}=await supabase.from("studio_record_types").insert({name:customTypeForm.name.trim(),slug,description:customTypeForm.description.trim()||null,created_by:session.user.id,is_system:false});if(error)setDatabaseError(error.message);else{setCustomTypeForm({name:"",slug:"",description:""});await loadWorldDatabase();}}
async function archiveDatabaseRecord(id:string,restore=false){const {error}=await supabase.from("studio_database_records").update({archived_at:restore?null:new Date().toISOString()}).eq("id",id);if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function openDatabaseRecord(r:StudioDatabaseRecord){const {data,error}=await supabase.rpc("studio_acquire_record_lock",{target_record_id:r.id});if(error){setDatabaseError(error.message);return;}if(data!==true){setDatabaseError("This record is currently being edited by another Studio admin.");await loadWorldDatabase();return;}setSelectedDatabaseRecordId(r.id);const recoveryKey=`umbra-v7-draft-${r.id}`;let source:any=r;try{const recovered=localStorage.getItem(recoveryKey);if(recovered&&confirm("A local recovery draft exists for this record. Restore it?"))source={...r,...JSON.parse(recovered)};}catch{}const sourceDetails=source.details||r.details||{};setRecordEditor({name:source.name??r.name,subtitle:source.subtitle??r.subtitle??"",summary:source.summary??r.summary??"",imageUrl:source.image_url??r.image_url??"",notes:source.notes??r.notes??"",workflowStatus:source.workflow_status??r.workflow_status??"draft",detailsText:JSON.stringify(sourceDetails,null,2)});setRecordVisualDetails(Object.entries(sourceDetails).map(([key,value])=>({key,value:typeof value==="string"?value:JSON.stringify(value,null,2)})));setRecordEditorMode("visual");setAutosaveStatus("");setAssignmentCollectionId("");setAssignmentTagId("");setRecordMediaId("");await loadWorldDatabase();}
async function saveDatabaseRecord(){if(!selectedDatabaseRecordId||!session)return;let details:Record<string,any>={};try{details=recordEditor.detailsText.trim()?JSON.parse(recordEditor.detailsText):{};}catch{setDatabaseError("Details must be valid JSON before saving.");return;}setDatabaseBusy(true);const {error}=await supabase.from("studio_database_records").update({name:recordEditor.name.trim(),subtitle:recordEditor.subtitle.trim()||null,summary:recordEditor.summary.trim()||null,image_url:recordEditor.imageUrl.trim()||null,notes:recordEditor.notes.trim()||null,workflow_status:recordEditor.workflowStatus,details,updated_by:session.user.id}).eq("id",selectedDatabaseRecordId);if(error)setDatabaseError(error.message);else{await supabase.rpc("studio_release_record_lock",{target_record_id:selectedDatabaseRecordId});localStorage.removeItem(`umbra-v7-draft-${selectedDatabaseRecordId}`);await loadWorldDatabase();setSelectedDatabaseRecordId(null);}setDatabaseBusy(false);}
function syncVisualDetails(next:Array<{key:string;value:string}>){setRecordVisualDetails(next);const obj:Record<string,any>={};for(const item of next){if(!item.key.trim())continue;let value:any=item.value;try{value=JSON.parse(item.value);}catch{}obj[item.key.trim()]=value;}setRecordEditor(x=>({...x,detailsText:JSON.stringify(obj,null,2)}));}
function addVisualDetail(){const key=newDetailField.key.trim();if(!key)return;if(recordVisualDetails.some(x=>x.key.toLowerCase()===key.toLowerCase())){setDatabaseError("That lore field already exists on this record.");return;}syncVisualDetails([...recordVisualDetails,{key,value:newDetailField.value}]);setNewDetailField({key:"",value:""});}
function removeVisualDetail(index:number){syncVisualDetails(recordVisualDetails.filter((_,i)=>i!==index));}
function saveLocalRecoveryDraft(){if(!selectedDatabaseRecordId)return;let details:any={};try{details=JSON.parse(recordEditor.detailsText||"{}");}catch{}localStorage.setItem(`umbra-v7-draft-${selectedDatabaseRecordId}`,JSON.stringify({name:recordEditor.name,subtitle:recordEditor.subtitle,summary:recordEditor.summary,image_url:recordEditor.imageUrl,notes:recordEditor.notes,workflow_status:recordEditor.workflowStatus,details}));setAutosaveStatus(`Recovery draft saved ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`);}
async function addRecordReference(recordId:string){if(!session||!referenceForm.label.trim())return;const {error}=await supabase.from("studio_record_references").insert({record_id:recordId,label:referenceForm.label.trim(),reference_type:referenceForm.referenceType,url:referenceForm.url.trim()||null,citation:referenceForm.citation.trim()||null,notes:referenceForm.notes.trim()||null,created_by:session.user.id});if(error)setDatabaseError(error.message);else{setReferenceForm({label:"",referenceType:"source",url:"",citation:"",notes:""});await loadWorldDatabase();}}
async function deleteRecordReference(id:string){const {error}=await supabase.from("studio_record_references").delete().eq("id",id);if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function assignCollection(recordId:string){if(!assignmentCollectionId)return;const {error}=await supabase.from("studio_collection_items").upsert({collection_id:assignmentCollectionId,entity_type:"database",entity_id:recordId},{onConflict:"collection_id,entity_type,entity_id"});if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function removeCollectionAssignment(id:string){const {error}=await supabase.from("studio_collection_items").delete().eq("id",id);if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function assignTag(recordId:string){if(!assignmentTagId)return;const {error}=await supabase.from("studio_tag_assignments").upsert({tag_id:assignmentTagId,entity_type:"database",entity_id:recordId},{onConflict:"tag_id,entity_type,entity_id"});if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function removeTagAssignment(id:string){const {error}=await supabase.from("studio_tag_assignments").delete().eq("id",id);if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function createUniversalLink(){if(!session||!linkForm.sourceId||!linkForm.targetId||!linkForm.label.trim())return;const {error}=await supabase.from("studio_universal_links").insert({source_type:"database",source_id:linkForm.sourceId,target_type:linkForm.targetType,target_id:linkForm.targetId,relation_label:linkForm.label.trim(),notes:linkForm.notes.trim()||null,created_by:session.user.id});if(error)setDatabaseError(error.message);else{setLinkForm({sourceId:"",targetType:"database",targetId:"",label:"",notes:""});await loadWorldDatabase();}}
async function deleteUniversalLink(id:string){const {error}=await supabase.from("studio_universal_links").delete().eq("id",id);if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function createMediaAsset(){if(!session||!mediaForm.title.trim()||!mediaForm.assetUrl.trim())return;const {error}=await supabase.from("studio_media_assets").insert({uploaded_by:session.user.id,title:mediaForm.title.trim(),asset_url:mediaForm.assetUrl.trim(),media_type:mediaForm.mediaType,caption:mediaForm.caption.trim()||null,credit:mediaForm.credit.trim()||null,alt_text:mediaForm.altText.trim()||null,tags:mediaForm.tags.split(",").map(x=>x.trim()).filter(Boolean)});if(error)setDatabaseError(error.message);else{setMediaForm({title:"",assetUrl:"",mediaType:"image",caption:"",credit:"",altText:"",tags:""});await loadWorldDatabase();}}
async function bulkWorkflow(status:string){const ids=[...selectedDatabaseRecordIds];if(!ids.length)return;const {error}=await supabase.from("studio_database_records").update({workflow_status:status}).in("id",ids);if(error)setDatabaseError(error.message);else{setSelectedDatabaseRecordIds(new Set());await loadWorldDatabase();}}
async function bulkArchive(){const ids=[...selectedDatabaseRecordIds];if(!ids.length)return;const {error}=await supabase.from("studio_database_records").update({archived_at:new Date().toISOString()}).in("id",ids);if(error)setDatabaseError(error.message);else{setSelectedDatabaseRecordIds(new Set());await loadWorldDatabase();}}
function toggleDatabaseSelection(id:string){setSelectedDatabaseRecordIds(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});}
async function createStudioBackup(){const label=backupLabel.trim()||`Umbra Studio backup ${new Date().toLocaleString()}`;const {error}=await supabase.rpc("studio_create_backup",{backup_label:label});if(error)setDatabaseError(error.message);else{setBackupLabel("");await loadWorldDatabase();}}
function exportStudioData(){const payload={version:"v10-studio-1.0",exported_at:new Date().toISOString(),studio_settings:studioSettings,characters:studioCharacters,codex:worldRecords,locations:worldLocations,timeline:timelineEvents,record_types:recordTypes,expanded_records:databaseRecords,collections,collection_items:collectionItems,tags:studioTags,tag_assignments:tagAssignments,universal_links:universalLinks,media_assets:mediaAssets,record_references:recordReferences,canon_history:canonHistory,continuity_issues:continuityIssues,story_projects:storyProjects,story_arcs:storyArcs,story_scenes:storyScenes,story_beats:storyBeats,story_entity_links:storyLinks,review_comments:reviewComments,assignments:studioAssignments,character_journey:characterJourney,direct_messages:directMessages};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`umbra-studio-1.0-export-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);}
function exportSelectedCsv(){const rows=databaseRecords.filter(r=>selectedDatabaseRecordIds.has(r.id));if(!rows.length)return;const esc=(v:any)=>`"${String(v??"").replace(/"/g,'""')}"`;const csv=["record_code,type,name,subtitle,workflow_status,summary",...rows.map(r=>[r.record_code,recordTypes.find(t=>t.id===r.record_type_id)?.name||"",r.name,r.subtitle,r.workflow_status,r.summary].map(esc).join(","))].join("\n");const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="umbra-studio-selected-records.csv";a.click();URL.revokeObjectURL(url);}
function recordCompleteness(r:StudioDatabaseRecord){let score=20;if(r.subtitle)score+=10;if(r.summary)score+=25;if(r.image_url)score+=15;if(r.details&&Object.keys(r.details).length)score+=15;if(tagAssignments.some(x=>x.entity_type==="database"&&x.entity_id===r.id))score+=5;if(collectionItems.some(x=>x.entity_type==="database"&&x.entity_id===r.id))score+=5;if(universalLinks.some(x=>(x.source_type==="database"&&x.source_id===r.id)||(x.target_type==="database"&&x.target_id===r.id)))score+=5;return Math.min(100,score);}

async function closeDatabaseRecord(){if(selectedDatabaseRecordId) await supabase.rpc("studio_release_record_lock",{target_record_id:selectedDatabaseRecordId});setSelectedDatabaseRecordId(null);await loadWorldDatabase();}
async function restoreDatabaseRevision(revision:DatabaseRevision){if(!confirm(`Restore ${revision.record_name||revision.record_code||"this record"} to this saved version? A new revision will preserve the current state first.`))return;const {error}=await supabase.rpc("studio_restore_database_revision",{revision_id:revision.id});if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function createFieldTemplate(){if(!session||!templateForm.recordTypeId||!templateForm.name.trim())return;let fields:any[]=[];try{fields=JSON.parse(templateForm.fieldsText);if(!Array.isArray(fields))throw new Error();}catch{setDatabaseError("Template fields must be a valid JSON array.");return;}const {error}=await supabase.from("studio_field_templates").insert({record_type_id:templateForm.recordTypeId,name:templateForm.name.trim(),fields,created_by:session.user.id});if(error)setDatabaseError(error.message);else{setTemplateForm({recordTypeId:"",name:"",fieldsText:'[{"key":"overview","label":"Overview"}]'});await loadWorldDatabase();}}
function applyTemplate(t:FieldTemplate){const selectedRecord=databaseRecords.find(r=>r.id===selectedDatabaseRecordId);if(!selectedRecord)return;let details:Record<string,any>={};try{details=JSON.parse(recordEditor.detailsText||"{}");}catch{}for(const f of t.fields||[])if(!(f.key in details))details[f.key]="";setRecordEditor({...recordEditor,detailsText:JSON.stringify(details,null,2)});setRecordVisualDetails(Object.entries(details).map(([key,value])=>({key,value:typeof value==="string"?value:JSON.stringify(value,null,2)})));}
async function attachMediaToRecord(recordId:string){if(!recordMediaId)return;const {error}=await supabase.from("studio_media_attachments").upsert({media_id:recordMediaId,entity_type:"database",entity_id:recordId},{onConflict:"media_id,entity_type,entity_id"});if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function detachMedia(id:string){const {error}=await supabase.from("studio_media_attachments").delete().eq("id",id);if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
function previewImport(){setImportError("");setCharacterImportPreview(null);try{const parsed=JSON.parse(importText);
const looksLikeCharacter = !Array.isArray(parsed) && parsed && typeof parsed==="object" && (
  parsed.identity || parsed.appearance || parsed.abilities || parsed.relationships || parsed.media ||
  parsed.character || parsed.fullName || parsed.name
);
if(looksLikeCharacter){
  const c:any = parsed.character && typeof parsed.character==="object" ? parsed.character : parsed;
  const identity:any = c.identity||{};
  const appearance:any = c.appearance||{};
  const origin:any = c.origin_lore||c.originLore||c.origin||{};
  const abilities:any = c.abilities||{};
  const relationships:any = c.relationships||{};
  const media:any = c.media||{};
  const pick=(...values:any[])=>values.find(v=>v!==undefined&&v!==null&&String(v).trim()!=="")??"";
  const lines=(value:any)=>Array.isArray(value)?value.join("\n"):String(value??"");
  const preview={
    name:pick(c.name,identity.name,c.fullName), alias:pick(c.alias,identity.alias), nicknames:lines(pick(c.nicknames,identity.nicknames)),
    titles:lines(pick(c.titles,identity.titles,c.primaryTitle)), pronunciation:pick(c.pronunciation,identity.pronunciation),
    nameMeaning:pick(c.nameMeaning,identity.nameMeaning), birthDate:pick(c.birthDate,identity.birthDate), elementalHeritage:pick(c.elementalHeritage,identity.elementalHeritage),
    canonStatus:pick(c.canonStatus,identity.canonStatus), spoilerLevel:pick(c.spoilerLevel,identity.spoilerLevel), era:pick(c.era,identity.era),
    age:pick(c.age,identity.age), apparentAge:pick(c.apparentAge,identity.apparentAge), pronouns:pick(c.pronouns,identity.pronouns),
    subrace:pick(c.subrace,identity.subrace), heritage:pick(c.heritage,identity.heritage), nationality:pick(c.nationality,identity.nationality),
    currentResidence:pick(c.currentResidence,identity.currentResidence), occupation:pick(c.occupation,identity.occupation), race:pick(c.race,identity.race,c.species),
    gender:pick(c.gender,identity.gender), homeland:pick(c.homeland,identity.homeland), affiliation:pick(c.affiliation,identity.affiliation),
    summary:pick(c.summary,identity.summary,c.quickSummary),
    skinTone:pick(c.skinTone,appearance.skinTone), skinHex:pick(c.skinHex,appearance.skinHex), faceDetails:pick(c.faceDetails,appearance.faceDetails),
    eyeColor:pick(c.eyeColor,appearance.eyeColor), eyeHex:pick(c.eyeHex,appearance.eyeHex), hairColor:pick(c.hairColor,appearance.hairColor),
    hairHex:pick(c.hairHex,appearance.hairHex), hairTexture:pick(c.hairTexture,appearance.hairTexture), hairStyle:pick(c.hairStyle,appearance.hairStyle),
    height:pick(c.height,appearance.height), weight:pick(c.weight,appearance.weight), dominantHand:pick(c.dominantHand,appearance.dominantHand),
    build:pick(c.build,appearance.build), postureMovement:pick(c.postureMovement,appearance.postureMovement), distinguishingFeatures:pick(c.distinguishingFeatures,appearance.distinguishingFeatures),
    makeup:pick(c.makeup,appearance.makeup), grooming:pick(c.grooming,appearance.grooming), nails:pick(c.nails,appearance.nails),
    colorPalette:lines(pick(c.colorPalette,appearance.colorPalette)), signatureOutfit:pick(c.signatureOutfit,appearance.signatureOutfit),
    outfitColors:lines(pick(c.outfitColors,appearance.outfitColors)), outfitMaterials:pick(c.outfitMaterials,appearance.outfitMaterials),
    wardrobe:lines(pick(c.wardrobe,appearance.wardrobe)), clothingStyle:pick(c.clothingStyle,appearance.clothingStyle), accessories:lines(pick(c.accessories,appearance.accessories)),
    alternateForm:pick(c.alternateForm,appearance.alternateForm), appearanceNotes:pick(c.appearanceNotes,appearance.appearanceNotes),
    birthplace:pick(c.birthplace,origin.birthplace), lineage:pick(c.lineage,origin.lineage), culture:pick(c.culture,origin.culture), childhood:pick(c.childhood,origin.childhood),
    backstory:pick(c.backstory,origin.backstory), majorLifeEvents:lines(pick(c.majorLifeEvents,origin.majorLifeEvents)), personality:pick(c.personality,origin.personality),
    voiceSpeech:pick(c.voiceSpeech,origin.voiceSpeech), psychology:pick(c.psychology,origin.psychology), lifestyle:pick(c.lifestyle,origin.lifestyle),
    likesDislikes:pick(c.likesDislikes,origin.likesDislikes), motivations:pick(c.motivations,origin.motivations), goals:pick(c.goals,origin.goals),
    fears:pick(c.fears,origin.fears), beliefs:pick(c.beliefs,origin.beliefs), storyRole:pick(c.storyRole,origin.storyRole), storyArc:pick(c.storyArc,origin.storyArc),
    powerSource:pick(c.powerSource,abilities.powerSource), primaryAbilities:lines(pick(c.primaryAbilities,abilities.primaryAbilities,c.powers)),
    secondaryAbilities:lines(pick(c.secondaryAbilities,abilities.secondaryAbilities)), signatureTechniques:lines(pick(c.signatureTechniques,abilities.signatureTechniques)),
    weapons:lines(pick(c.weapons,abilities.weapons)), weaponDetails:pick(c.weaponDetails,abilities.weaponDetails), transformations:lines(pick(c.transformations,abilities.transformations)),
    transformationDetails:pick(c.transformationDetails,abilities.transformationDetails), strengths:lines(pick(c.strengths,abilities.strengths)), weaknesses:lines(pick(c.weaknesses,abilities.weaknesses)),
    limitations:pick(c.limitations,abilities.limitations), combatStyle:pick(c.combatStyle,abilities.combatStyle), combatProfile:pick(c.combatProfile,abilities.combatProfile), abilityNotes:pick(c.abilityNotes,abilities.abilityNotes),
    parents:lines(pick(c.parents,relationships.parents)), siblings:lines(pick(c.siblings,relationships.siblings)), children:lines(pick(c.children,relationships.children)),
    partner:pick(c.partner,relationships.partner), allies:lines(pick(c.allies,relationships.allies)), rivals:lines(pick(c.rivals,relationships.rivals)), enemies:lines(pick(c.enemies,relationships.enemies)),
    mentors:lines(pick(c.mentors,relationships.mentors)), relationshipNotes:pick(c.relationshipNotes,relationships.relationshipNotes), worldConnections:lines(pick(c.worldConnections,relationships.worldConnections)),
    visualAssets:lines(pick(c.visualAssets,media.visualAssets)), productionNotes:pick(c.productionNotes,media.productionNotes), canonLocks:lines(pick(c.canonLocks,media.canonLocks)),
    tbdFields:lines(pick(c.tbdFields,media.tbdFields)), portraitUrl:pick(c.portraitUrl,media.portraitUrl,c.portrait_url), referenceArtUrl:pick(c.referenceArtUrl,media.referenceArtUrl),
    alternateFormUrl:pick(c.alternateFormUrl,media.alternateFormUrl), galleryUrl:pick(c.galleryUrl,media.galleryUrl), galleryUrls:Array.isArray(c.galleryUrls)?c.galleryUrls:Array.isArray(media.galleryUrls)?media.galleryUrls:[],
    mediaNotes:pick(c.mediaNotes,media.mediaNotes)
  };
  if(!preview.name)throw new Error("Character import needs at least a name.");
  setCharacterImportPreview(preview);setImportPreview([]);return;
}
const rows=Array.isArray(parsed)?parsed:Array.isArray(parsed?.expanded_records)?parsed.expanded_records:[];if(!rows.length)throw new Error("No records found. Paste a JSON array or an Umbra Studio export containing expanded_records.");const normalized=rows.map((r:any,i:number)=>({row:i+1,record_type_slug:r.record_type_slug||r.type_slug||r.type||"",name:String(r.name||"").trim(),subtitle:r.subtitle||null,summary:r.summary||null,details:r.details&&typeof r.details==="object"?r.details:{},workflow_status:["draft","in_review","approved","published"].includes(r.workflow_status)?r.workflow_status:"draft"}));const invalid=normalized.filter((r:any)=>!r.name||!r.record_type_slug);if(invalid.length)throw new Error(`${invalid.length} row(s) are missing name or record_type_slug.`);setImportPreview(normalized);}catch(e){setImportPreview([]);setImportError(e instanceof Error?e.message:"Import JSON could not be read.");}}
function normalizeImportName(value:any){return String(value??"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"");}
function importedNameList(value:any){return String(value??"").split(/[\n,;|]+/).map(x=>x.trim()).filter(Boolean);}
async function applyCharacterImport(){
 if(!characterImportPreview)return;
 const imported={...characterImportPreview};
 openCreateCharacter();
 setCharacter(current=>({...current,...imported,galleryUrls:Array.isArray(imported.galleryUrls)?imported.galleryUrls:current.galleryUrls}));
 const availableWorld=worldRecords.length?worldRecords:(await supabase.from("studio_world_records").select("id, user_id, record_type, name, subtype, description, emblem_url, cover_url, lore_details, is_public, created_at, updated_at").order("name")).data as WorldRecord[]||[];
 const findWorld=(type:"realm"|"race"|"faction"|"family",value:any)=>availableWorld.find(x=>x.record_type===type&&normalizeImportName(x.name)===normalizeImportName(value));
 const realm=findWorld("realm",imported.homeland)||findWorld("realm",imported.currentResidence);
 const race=findWorld("race",imported.race);
 const faction=findWorld("faction",imported.affiliation);
 const family=findWorld("family",imported.lineage);
 if(realm)setLinkedRealmId(realm.id); if(race)setLinkedRaceId(race.id); if(faction)setLinkedFactionId(faction.id); if(family)setLinkedFamilyId(family.id);
 if(!worldRecords.length)setWorldRecords(availableWorld);
 const {data:characterRows}=await supabase.from("studio_characters").select("id, user_id, name, status, identity, appearance, origin_lore, abilities, relationships, media, portrait_url, current_step, is_complete, is_public, realm_record_id, race_record_id, faction_record_id, family_record_id, updated_at").order("name");
 const options=(characterRows??[]) as StudioCharacterRow[]; setRelationshipOptions(options);
 const relationGroups:[string,string][]=[["parents","parent"],["siblings","sibling"],["children","child"],["partner","partner"],["allies","ally"],["rivals","rival"],["enemies","enemy"],["mentors","mentor"]];
 const matched:string[]=[];
 for(const [field,type] of relationGroups){for(const name of importedNameList(imported[field])){const target=options.find(x=>normalizeImportName(x.name)===normalizeImportName(name));if(target)matched.push(`${type}: ${target.name}`);}}
 if(matched.length)setRelationshipError(`Matched existing records: ${matched.join(" • ")}. Review and connect them in Relationships before final save.`);
 setImportText("");setCharacterImportPreview(null);setCreatorStep(1);setPage("create");window.scrollTo({top:0,behavior:"smooth"});
}
async function commitImport(){if(!session||!importPreview.length)return;setDatabaseBusy(true);setImportError("");try{for(const row of importPreview){const type=recordTypes.find(t=>t.slug===row.record_type_slug||t.name.toLowerCase()===String(row.record_type_slug).toLowerCase());if(!type)throw new Error(`Unknown record type: ${row.record_type_slug}`);const {error}=await supabase.from("studio_database_records").insert({created_by:session.user.id,updated_by:session.user.id,record_type_id:type.id,name:row.name,subtitle:row.subtitle,summary:row.summary,details:row.details,workflow_status:row.workflow_status});if(error)throw error;}setImportText("");setImportPreview([]);await loadWorldDatabase();}catch(e){setImportError(e instanceof Error?e.message:"Import failed.");}finally{setDatabaseBusy(false);}}
function duplicateGroups(){const active=databaseRecords.filter(r=>!r.archived_at);const groups=new Map<string,StudioDatabaseRecord[]>();for(const r of active){const key=`${r.record_type_id}|${r.name.trim().toLowerCase().replace(/[^a-z0-9]/g,"")}`;groups.set(key,[...(groups.get(key)||[]),r]);}return [...groups.values()].filter(g=>g.length>1);}
async function loadV9Production(){
 if(!session)return; setProductionBusy(true); setProductionError("");
 try{
  const [projects,arcs,scenes,beats,links,comments,assignments,notifications,journey,changes,health]=await Promise.all([
   supabase.from("studio_story_projects").select("*").order("updated_at",{ascending:false}),
   supabase.from("studio_story_arcs").select("*").order("sort_order").order("updated_at",{ascending:false}),
   supabase.from("studio_story_scenes").select("*").order("sort_order").order("updated_at",{ascending:false}),
   supabase.from("studio_story_beats").select("*").order("sort_order").order("updated_at",{ascending:false}),
   supabase.from("studio_story_entity_links").select("*").order("created_at",{ascending:false}),
   supabase.from("studio_review_comments").select("*").order("created_at",{ascending:false}).limit(300),
   supabase.from("studio_assignments").select("*").order("updated_at",{ascending:false}).limit(300),
   supabase.from("studio_notifications").select("*").order("created_at",{ascending:false}).limit(300),
   supabase.from("studio_character_journey").select("*").order("sort_order").order("created_at",{ascending:false}).limit(500),
   supabase.rpc("studio_changes_since_last_visit"),
   supabase.rpc("studio_v9_production_health")
  ]);
  for(const r of [projects,arcs,scenes,beats,links,comments,assignments,notifications,journey])if(r.error)throw r.error;
  setStoryProjects((projects.data??[]) as StoryProject[]); setStoryArcs((arcs.data??[]) as StoryArc[]); setStoryScenes((scenes.data??[]) as StoryScene[]); setStoryBeats((beats.data??[]) as StoryBeat[]); setStoryLinks((links.data??[]) as StoryEntityLink[]); setReviewComments((comments.data??[]) as ReviewComment[]); setStudioAssignments((assignments.data??[]) as StudioAssignment[]); setStudioNotifications((notifications.data??[]) as StudioNotification[]); setCharacterJourney((journey.data??[]) as CharacterJourney[]);
  if(!changes.error)setChangesSinceVisit((changes.data??[]) as ChangeSinceVisit[]); if(!health.error&&health.data)setV9Health(health.data as V9Health);
 }catch(f){setProductionError(f instanceof Error?f.message:"Story Production could not be loaded.");}finally{setProductionBusy(false);}
}
async function openProduction(tab:typeof productionTab="overview"){setProductionTab(tab);setPage("production");window.scrollTo({top:0,behavior:"smooth"});await Promise.all([loadV9Production(),loadAdminCenter(),loadWorldDatabase()]);}
async function createStoryProject(){if(!session||!projectForm.title.trim())return;const {error}=await supabase.from("studio_story_projects").insert({title:projectForm.title.trim(),project_type:projectForm.projectType,summary:projectForm.summary.trim()||null,status:projectForm.status,created_by:session.user.id,updated_by:session.user.id});if(error)setProductionError(error.message);else{setProjectForm({title:"",projectType:"story",summary:"",status:"planning"});await loadV9Production();}}
async function createStoryArc(){if(!session||!arcForm.title.trim())return;const {error}=await supabase.from("studio_story_arcs").insert({project_id:arcForm.projectId||null,title:arcForm.title.trim(),summary:arcForm.summary.trim()||null,status:arcForm.status,created_by:session.user.id,updated_by:session.user.id});if(error)setProductionError(error.message);else{setArcForm({projectId:"",title:"",summary:"",status:"planned"});await loadV9Production();}}
async function createStoryScene(){if(!session||!sceneForm.title.trim())return;const {error}=await supabase.from("studio_story_scenes").insert({project_id:sceneForm.projectId||null,arc_id:sceneForm.arcId||null,title:sceneForm.title.trim(),summary:sceneForm.summary.trim()||null,pov_character_id:sceneForm.povId||null,location_id:sceneForm.locationId||null,era:sceneForm.era.trim()||null,story_date:sceneForm.storyDate.trim()||null,status:sceneForm.status,created_by:session.user.id,updated_by:session.user.id});if(error)setProductionError(error.message);else{setSceneForm({projectId:"",arcId:"",title:"",summary:"",povId:"",locationId:"",era:"",storyDate:"",status:"idea"});await loadV9Production();}}
async function createStoryBeat(){if(!session||!beatForm.title.trim())return;const {error}=await supabase.from("studio_story_beats").insert({project_id:beatForm.projectId||null,arc_id:beatForm.arcId||null,scene_id:beatForm.sceneId||null,title:beatForm.title.trim(),description:beatForm.description.trim()||null,beat_type:beatForm.beatType,status:beatForm.status,created_by:session.user.id});if(error)setProductionError(error.message);else{setBeatForm({projectId:"",arcId:"",sceneId:"",title:"",description:"",beatType:"plot",status:"idea"});await loadV9Production();}}
async function updateProductionStatus(table:string,id:string,status:string){const {error}=await supabase.from(table).update({status,updated_at:new Date().toISOString()}).eq("id",id);if(error)setProductionError(error.message);else await loadV9Production();}
async function addReviewCommentV9(){if(!commentForm.entityId||!commentForm.body.trim())return;const {error}=await supabase.rpc("studio_add_review_comment",{target_entity_type:commentForm.entityType,target_entity_id:commentForm.entityId,comment_body:commentForm.body.trim(),notify_user_id:commentForm.notifyUserId||null});if(error)setProductionError(error.message);else{setCommentForm(x=>({...x,body:"",notifyUserId:""}));await loadV9Production();}}
async function resolveReviewComment(id:string){const {error}=await supabase.from("studio_review_comments").update({status:"resolved",resolved_by:session?.user.id,resolved_at:new Date().toISOString()}).eq("id",id);if(error)setProductionError(error.message);else await loadV9Production();}
async function createAssignmentV9(){if(!assignmentForm.title.trim()||!assignmentForm.assignedTo)return;const {error}=await supabase.rpc("studio_create_assignment",{assignment_title:assignmentForm.title.trim(),assignment_description:assignmentForm.description.trim(),target_entity_type:assignmentForm.entityType,target_entity_id:assignmentForm.entityId||null,target_user_id:assignmentForm.assignedTo,assignment_priority:assignmentForm.priority,assignment_due_at:assignmentForm.dueAt?new Date(assignmentForm.dueAt).toISOString():null});if(error)setProductionError(error.message);else{setAssignmentForm({title:"",description:"",entityType:"story_project",entityId:"",assignedTo:"",priority:"normal",dueAt:""});await loadV9Production();}}
async function markNotificationRead(id:string){await supabase.from("studio_notifications").update({is_read:true}).eq("id",id);await loadV9Production();}
async function createJourneyEvent(){if(!session||!journeyForm.characterId||!journeyForm.title.trim())return;const {error}=await supabase.from("studio_character_journey").insert({character_id:journeyForm.characterId,project_id:journeyForm.projectId||null,arc_id:journeyForm.arcId||null,scene_id:journeyForm.sceneId||null,journey_type:journeyForm.journeyType,title:journeyForm.title.trim(),description:journeyForm.description.trim()||null,before_value:journeyForm.beforeValue.trim()||null,after_value:journeyForm.afterValue.trim()||null,created_by:session.user.id});if(error)setProductionError(error.message);else{setJourneyForm({characterId:"",projectId:"",arcId:"",sceneId:"",journeyType:"development",title:"",description:"",beforeValue:"",afterValue:""});await loadV9Production();}}
function productionEntityOptions(type:string){if(type==="story_project")return storyProjects.map(x=>({id:x.id,label:x.title}));if(type==="story_arc")return storyArcs.map(x=>({id:x.id,label:x.title}));if(type==="story_scene")return storyScenes.map(x=>({id:x.id,label:x.title}));if(type==="database")return databaseRecords.map(x=>({id:x.id,label:x.name}));if(type==="character")return studioCharacters.map(x=>({id:x.id,label:x.name}));if(type==="codex")return worldRecords.map(x=>({id:x.id,label:x.name}));if(type==="location")return worldLocations.map(x=>({id:x.id,label:x.name}));return timelineEvents.map(x=>({id:x.id,label:x.title}));}

async function loadStudioSettings(){const {data,error}=await supabase.from("studio_settings").select("*").eq("id",true).maybeSingle();if(error){setSettingsError(error.message);return;}if(data)setStudioSettings(data as StudioSettings);}
async function openStudioSettings(){setPage("settings");window.scrollTo({top:0,behavior:"smooth"});await Promise.all([loadStudioSettings(),loadAdminCenter(),loadV9Production()]);}
async function loadDirectMessages(){if(!session)return;setMessagesBusy(true);setMessagesError("");try{const {data,error}=await supabase.from("studio_direct_messages").select("id,sender_user_id,recipient_user_id,body,entity_type,entity_id,read_at,created_at").or(`sender_user_id.eq.${session.user.id},recipient_user_id.eq.${session.user.id}`).order("created_at",{ascending:true}).limit(1000);if(error)throw error;setDirectMessages((data??[]) as StudioDirectMessage[]);}catch(f){setMessagesError(f instanceof Error?f.message:"Messages could not be loaded.");}finally{setMessagesBusy(false);}}
async function openMessages(){setPage("messages");window.scrollTo({top:0,behavior:"smooth"});await Promise.all([loadAdminCenter(),loadDirectMessages()]);}
async function sendDirectMessage(){const targetUserId=messageRecipientId||adminMembers.find(m=>m.user_id!==session?.user.id)?.user_id||"";if(!session||!targetUserId||!messageBody.trim()||messagesBusy)return;const body=messageBody.trim();setMessagesBusy(true);setMessagesError("");try{const {error}=await supabase.rpc("studio_send_direct_message",{target_user_id:targetUserId,message_body:body});if(error)throw error;setMessageRecipientId(targetUserId);setMessageBody("");await loadDirectMessages();}catch(f){setMessagesError(f instanceof Error?f.message:"Message could not be sent.");}finally{setMessagesBusy(false);}}
async function markConversationRead(otherUserId:string){if(!session)return;const {error}=await supabase.rpc("studio_mark_conversation_read",{other_user_id:otherUserId});if(error){setMessagesError(error.message);return;}await loadDirectMessages();}
async function openTransferCenter(){setPage("transfer");window.scrollTo({top:0,behavior:"smooth"});await Promise.all([loadWorldDatabase(),loadAdminCenter(),loadV9Production(),loadStudioSettings(),loadDirectMessages()]);}
function validateBackupFile(file:File|null){setBackupValidation(null);if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const payload=JSON.parse(String(reader.result||"{}"));if(!payload||typeof payload!=="object")throw new Error("This is not a Studio backup object.");const version=String(payload.version||"");if(!version.startsWith("v10"))throw new Error(`Unsupported backup version: ${version||"unknown"}.`);const counts=[['characters',payload.characters],['codex',payload.codex],['locations',payload.locations],['timeline',payload.timeline],['lore records',payload.expanded_records],['story projects',payload.story_projects],['story scenes',payload.story_scenes]].map(([label,rows]:any)=>`${Array.isArray(rows)?rows.length:0} ${label}`).join(" • ");setBackupValidation({ok:true,message:"Valid Umbra Studio 1.0 backup.",summary:counts});}catch(e){setBackupValidation({ok:false,message:e instanceof Error?e.message:"Backup could not be validated."});}};reader.readAsText(file);}

async function saveStudioSettings(){if(!studioSettings||adminRole!=="primary_admin")return;setSettingsBusy(true);setSettingsError("");const {error}=await supabase.from("studio_settings").update({...studioSettings,updated_by:session?.user.id,updated_at:new Date().toISOString()}).eq("id",true);if(error)setSettingsError(error.message);else await loadStudioSettings();setSettingsBusy(false);}
async function registerStudioSession(){if(!session?.user.id||activeStudioSessionId)return;const {data,error}=await supabase.rpc("studio_record_login");if(!error&&data)setActiveStudioSessionId(String(data));}
async function touchStudioSession(){if(activeStudioSessionId)await supabase.rpc("studio_touch_session",{target_session_id:activeStudioSessionId});}
async function setMyDisplayName(){if(!myStudioDisplayName.trim())return;const {error}=await supabase.rpc("studio_set_my_display_name",{new_display_name:myStudioDisplayName.trim()});if(error)setAdminError(error.message);else await loadAdminCenter();}
async function setMemberDisplayName(userId:string,name:string){const {error}=await supabase.rpc("studio_set_member_display_name",{member_user_id:userId,new_display_name:name.trim()});if(error)setAdminError(error.message);else await loadAdminCenter();}
async function changeCanonStatus(recordId:string,status:string){const {error}=await supabase.rpc("studio_set_database_canon_status",{target_record_id:recordId,new_status:status,change_reason:canonReason.trim()||null});if(error)setDatabaseError(error.message);else{setCanonReason("");await loadWorldDatabase();}}
async function toggleRecordPublic(recordId:string,value:boolean){const record=databaseRecords.find(r=>r.id===recordId);if(!record)return;if(value&&record.workflow_status!=="published"){setDatabaseError("Publish the editorial workflow first, then enable encyclopedia visibility.");return;}if(value&&!['draft_canon','canon'].includes(record.canon_status||'concept')){setDatabaseError("Only Draft Canon or Canon records can be exposed to the encyclopedia.");return;}const slug=(record.public_slug||record.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+record.record_code.toLowerCase()).slice(0,120);const {error}=await supabase.from("studio_database_records").update({is_public:value,public_slug:slug}).eq("id",recordId);if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function runContinuityScan(){setDatabaseBusy(true);const {error}=await supabase.rpc("studio_run_continuity_scan");if(error)setDatabaseError(error.message);else await loadWorldDatabase();setDatabaseBusy(false);}
async function setContinuityStatus(id:string,status:string){const patch:any={status,updated_at:new Date().toISOString()};if(status==='resolved'){patch.resolved_by=session?.user.id;patch.resolved_at=new Date().toISOString();}const {error}=await supabase.from("studio_continuity_issues").update(patch).eq("id",id);if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function savePublicSettings(){if(!publicSettings)return;const {error}=await supabase.from("studio_public_settings").update({...publicSettings,updated_by:session?.user.id,updated_at:new Date().toISOString()}).eq("id",true);if(error)setDatabaseError(error.message);else await loadWorldDatabase();}
async function openPublicEncyclopedia(){setError("");const [settings,records,types,characters,codex,locations,timeline]=await Promise.all([supabase.from("studio_public_settings").select("*").eq("id",true).maybeSingle(),supabase.from("studio_database_records").select("*").eq("is_public",true).eq("workflow_status","published").eq("spoiler_level","public").is("archived_at",null).order("name"),supabase.from("studio_record_types").select("id,slug,name,description,icon,is_system").order("name"),supabase.from("studio_characters").select("id,user_id,name,status,identity,appearance,origin_lore,abilities,relationships,media,portrait_url,current_step,is_complete,is_public,realm_record_id,race_record_id,faction_record_id,family_record_id,updated_at").eq("is_public",true).eq("is_complete",true).eq("spoiler_level","public").order("name"),supabase.from("studio_world_records").select("id,user_id,record_type,name,subtype,description,emblem_url,cover_url,lore_details,is_public,created_at,updated_at").eq("is_public",true).eq("spoiler_level","public").order("name"),supabase.from("studio_world_locations").select("id,user_id,name,location_type,description,parent_location_id,codex_record_id,map_x,map_y,image_url,tags,is_public,archived_at,created_at,updated_at").eq("is_public",true).eq("spoiler_level","public").is("archived_at",null).order("name"),supabase.from("studio_timeline_events").select("id,user_id,title,era,display_date,sort_order,description,location_id,codex_record_id,character_id,image_url,tags,is_public,archived_at,created_at,updated_at").eq("is_public",true).eq("spoiler_level","public").is("archived_at",null).order("sort_order")]);if(settings.error){setError(settings.error.message);return;}if(!settings.data?.is_enabled){setError("The public Umbra Encyclopedia is not enabled yet.");return;}if(records.error){setError(records.error.message);return;}setPublicBrowseSettings(settings.data as PublicSettings);setPublicBrowseRecords((records.data??[]) as StudioDatabaseRecord[]);setPublicBrowseTypes((types.data??[]) as StudioRecordType[]);if(!characters.error)setPublicBrowseCharacters((characters.data??[]) as StudioCharacterRow[]);if(!codex.error)setPublicBrowseWorld((codex.data??[]) as WorldRecord[]);if(!locations.error)setPublicBrowseLocations((locations.data??[]) as WorldLocation[]);if(!timeline.error)setPublicBrowseTimeline((timeline.data??[]) as TimelineEvent[]);setPublicBrowse(true);}
async function handleSignIn(e: FormEvent<HTMLFormElement>) {
e.preventDefault();

setError("");
setSigningIn(true);

const { error: signInError } =
  await supabase.auth.signInWithPassword({
    email,
    password,
  });

if (signInError) {
  setError(signInError.message);
}

setSigningIn(false);

}

async function handleSignOut() {
setError("");
setPage("dashboard");
if(activeStudioSessionId) await supabase.rpc("studio_record_logout",{target_session_id:activeStudioSessionId});
setActiveStudioSessionId(null);
await supabase.auth.signOut();
}

async function loadMyCharacters() {
setCharactersError("");
setLoadingCharacters(true);

try {
  const { data, error: loadError } = await supabase
    .from("studio_characters")
    .select("id, user_id, name, status, identity, appearance, origin_lore, abilities, relationships, media, portrait_url, current_step, is_complete, is_public, realm_record_id, race_record_id, faction_record_id, family_record_id, updated_at")
    .order("updated_at", { ascending: false });

  if (loadError) throw loadError;
  setStudioCharacters((data ?? []) as StudioCharacterRow[]);
} catch (loadFailure) {
  setCharactersError(
    loadFailure instanceof Error
      ? loadFailure.message
      : "Your characters could not be loaded."
  );
} finally {
  setLoadingCharacters(false);
}
}

async function openMyCharacters() {
setPage("characters");
window.scrollTo({ top: 0, behavior: "smooth" });
await loadMyCharacters();
}

async function openCharacterLibrary() {
setPage("library");
setLibraryError("");
setLoadingLibrary(true);
window.scrollTo({ top: 0, behavior: "smooth" });

try {
  const { data, error: loadError } = await supabase
    .from("studio_characters")
    .select("id, user_id, name, status, identity, appearance, origin_lore, abilities, relationships, media, portrait_url, current_step, is_complete, is_public, realm_record_id, race_record_id, faction_record_id, family_record_id, updated_at")
    .eq("is_complete", true)
    .eq("is_public", true)
    .order("updated_at", { ascending: false });

  if (loadError) throw loadError;
  setLibraryCharacters((data ?? []) as StudioCharacterRow[]);
} catch (loadFailure) {
  setLibraryError(
    loadFailure instanceof Error
      ? loadFailure.message
      : "The Character Library could not be loaded."
  );
} finally {
  setLoadingLibrary(false);
}
}

function openCharacterProfile(saved: StudioCharacterRow, from: "characters" | "library") {
setSelectedCharacter(saved);
setProfileReturnPage(from);
setPage("profile");
void loadConnectedRelationships(saved.id);
void loadWorldRecords();
window.scrollTo({ top: 0, behavior: "smooth" });
}

function returnFromProfile() {
setPage(profileReturnPage);
window.scrollTo({ top: 0, behavior: "smooth" });
}

function loadCharacterIntoEditor(saved: StudioCharacterRow) {
const identity = saved.identity ?? {};
const appearance = saved.appearance ?? {};
const origin = saved.origin_lore ?? {};
const abilities = saved.abilities ?? {};
const relationships = saved.relationships ?? {};
const media = saved.media ?? {};

setStudioCharacterId(saved.id);
setSaveError("");
void loadRelationshipOptions(saved.id);
void loadConnectedRelationships(saved.id);
void loadWorldRecords();
setLinkedRealmId(saved.realm_record_id ?? "");
setLinkedRaceId(saved.race_record_id ?? "");
setLinkedFactionId(saved.faction_record_id ?? "");
setLinkedFamilyId(saved.family_record_id ?? "");
setCharacter({
  name: identity.name ?? saved.name ?? "",
  alias: identity.alias ?? "",
  nicknames: identity.nicknames ?? "",
  titles: identity.titles ?? "",
  pronunciation: identity.pronunciation ?? "",
  nameMeaning: identity.nameMeaning ?? "",
  birthDate: identity.birthDate ?? "",
  elementalHeritage: identity.elementalHeritage ?? "",
  canonStatus: identity.canonStatus ?? "",
  spoilerLevel: identity.spoilerLevel ?? "",
  era: identity.era ?? "",
  age: identity.age ?? "",
  apparentAge: identity.apparentAge ?? "",
  pronouns: identity.pronouns ?? "",
  subrace: identity.subrace ?? "",
  heritage: identity.heritage ?? "",
  nationality: identity.nationality ?? "",
  currentResidence: identity.currentResidence ?? "",
  occupation: identity.occupation ?? "",
  race: identity.race ?? "",
  gender: identity.gender ?? "",
  homeland: identity.homeland ?? "",
  affiliation: identity.affiliation ?? "",
  summary: identity.summary ?? "",
  skinTone: appearance.skinTone ?? "",
  skinHex: appearance.skinHex ?? "",
  faceDetails: appearance.faceDetails ?? "",
  eyeColor: appearance.eyeColor ?? "",
  eyeHex: appearance.eyeHex ?? "",
  hairColor: appearance.hairColor ?? "",
  hairHex: appearance.hairHex ?? "",
  hairTexture: appearance.hairTexture ?? "",
  hairStyle: appearance.hairStyle ?? "",
  height: appearance.height ?? "",
  weight: appearance.weight ?? "",
  dominantHand: appearance.dominantHand ?? "",
  build: appearance.build ?? "",
  postureMovement: appearance.postureMovement ?? "",
  distinguishingFeatures: appearance.distinguishingFeatures ?? "",
  makeup: appearance.makeup ?? "",
  grooming: appearance.grooming ?? "",
  nails: appearance.nails ?? "",
  colorPalette: appearance.colorPalette ?? "",
  signatureOutfit: appearance.signatureOutfit ?? "",
  outfitColors: appearance.outfitColors ?? "",
  outfitMaterials: appearance.outfitMaterials ?? "",
  wardrobe: appearance.wardrobe ?? "",
  clothingStyle: appearance.clothingStyle ?? "",
  accessories: appearance.accessories ?? "",
  alternateForm: appearance.alternateForm ?? "",
  appearanceNotes: appearance.appearanceNotes ?? "",
  birthplace: origin.birthplace ?? "",
  lineage: origin.lineage ?? "",
  culture: origin.culture ?? "",
  childhood: origin.childhood ?? "",
  backstory: origin.backstory ?? "",
  majorLifeEvents: origin.majorLifeEvents ?? "",
  personality: origin.personality ?? "",
  voiceSpeech: origin.voiceSpeech ?? "",
  psychology: origin.psychology ?? "",
  lifestyle: origin.lifestyle ?? "",
  likesDislikes: origin.likesDislikes ?? "",
  motivations: origin.motivations ?? "",
  goals: origin.goals ?? "",
  fears: origin.fears ?? "",
  beliefs: origin.beliefs ?? "",
  storyRole: origin.storyRole ?? "",
  storyArc: origin.storyArc ?? "",
  powerSource: abilities.powerSource ?? "",
  primaryAbilities: abilities.primaryAbilities ?? "",
  secondaryAbilities: abilities.secondaryAbilities ?? "",
  signatureTechniques: abilities.signatureTechniques ?? "",
  weapons: abilities.weapons ?? "",
  weaponDetails: abilities.weaponDetails ?? "",
  transformations: abilities.transformations ?? "",
  transformationDetails: abilities.transformationDetails ?? "",
  strengths: abilities.strengths ?? "",
  weaknesses: abilities.weaknesses ?? "",
  limitations: abilities.limitations ?? "",
  combatStyle: abilities.combatStyle ?? "",
  combatProfile: abilities.combatProfile ?? "",
  abilityNotes: abilities.abilityNotes ?? "",
  parents: relationships.parents ?? "",
  siblings: relationships.siblings ?? "",
  children: relationships.children ?? "",
  partner: relationships.partner ?? "",
  allies: relationships.allies ?? "",
  rivals: relationships.rivals ?? "",
  enemies: relationships.enemies ?? "",
  mentors: relationships.mentors ?? "",
  relationshipNotes: relationships.relationshipNotes ?? "",
  worldConnections: relationships.worldConnections ?? "",
  visualAssets: media.visualAssets ?? "",
  productionNotes: media.productionNotes ?? "",
  canonLocks: media.canonLocks ?? "",
  tbdFields: media.tbdFields ?? "",
  portraitUrl: media.portraitUrl ?? saved.portrait_url ?? "",
  referenceArtUrl: media.referenceArtUrl ?? "",
  alternateFormUrl: media.alternateFormUrl ?? "",
  galleryUrl: media.galleryUrl ?? "",
  galleryUrls: Array.isArray(media.galleryUrls) ? media.galleryUrls : [],
  mediaNotes: media.mediaNotes ?? "",
});
setCreatorStep(Math.min(6, Math.max(1, saved.current_step ?? 1)));
setPage("create");
window.scrollTo({ top: 0, behavior: "smooth" });
}


async function loadRelationshipOptions(currentId?: string | null) {
  if (!session) return;
  const { data } = await supabase
    .from("studio_characters")
    .select("id, user_id, name, status, identity, appearance, origin_lore, abilities, relationships, media, portrait_url, current_step, is_complete, is_public, realm_record_id, race_record_id, faction_record_id, family_record_id, updated_at")
    .order("name", { ascending: true });
  setRelationshipOptions(((data ?? []) as StudioCharacterRow[]).filter((item) => item.id !== currentId));
}

async function loadConnectedRelationships(characterId: string) {
  setRelationshipError("");
  const { data, error: relationLoadError } = await supabase
    .from("studio_character_relationships")
    .select("id, source_character_id, target_character_id, relationship_type")
    .eq("source_character_id", characterId)
    .order("created_at", { ascending: true });
  if (relationLoadError) { setRelationshipError(relationLoadError.message); return; }
  const rows = (data ?? []) as CharacterRelationship[];
  const targetIds = rows.map((row) => row.target_character_id);
  if (!targetIds.length) { setConnectedRelationships([]); return; }
  const { data: targets, error: targetError } = await supabase
    .from("studio_characters")
    .select("id, user_id, name, status, identity, appearance, origin_lore, abilities, relationships, media, portrait_url, current_step, is_complete, is_public, realm_record_id, race_record_id, faction_record_id, family_record_id, updated_at")
    .in("id", targetIds);
  if (targetError) { setRelationshipError(targetError.message); return; }
  const targetMap = new Map(((targets ?? []) as StudioCharacterRow[]).map((item) => [item.id, item]));
  setConnectedRelationships(rows.map((row) => ({ ...row, target: targetMap.get(row.target_character_id) ?? null })));
}

const reciprocalRelationship: Record<string, string> = {
  parent: "child", child: "parent", sibling: "sibling", partner: "partner",
  ally: "ally", rival: "rival", enemy: "enemy", mentor: "student", student: "mentor",
};

async function addConnectedRelationship() {
  if (!session || !relationshipTargetId || relationshipBusy) return;
  setRelationshipBusy(true); setRelationshipError("");
  try {
    const sourceId = await ensureStudioCharacterId();
    if (sourceId === relationshipTargetId) throw new Error("A character cannot be connected to themselves.");
    const reverseType = reciprocalRelationship[relationshipType] || relationshipType;
    const { error: firstError } = await supabase.from("studio_character_relationships").upsert({
      owner_user_id: session.user.id, source_character_id: sourceId, target_character_id: relationshipTargetId, relationship_type: relationshipType,
    }, { onConflict: "source_character_id,target_character_id,relationship_type" });
    if (firstError) throw firstError;
    const { error: reverseError } = await supabase.from("studio_character_relationships").upsert({
      owner_user_id: session.user.id, source_character_id: relationshipTargetId, target_character_id: sourceId, relationship_type: reverseType,
    }, { onConflict: "source_character_id,target_character_id,relationship_type" });
    if (reverseError) throw reverseError;
    setRelationshipTargetId("");
    await loadConnectedRelationships(sourceId);
  } catch (failure) { setRelationshipError(failure instanceof Error ? failure.message : "Relationship could not be saved."); }
  finally { setRelationshipBusy(false); }
}

async function removeConnectedRelationship(link: CharacterRelationship) {
  if (!session || relationshipBusy) return;
  setRelationshipBusy(true); setRelationshipError("");
  try {
    const reverseType = reciprocalRelationship[link.relationship_type] || link.relationship_type;
    const { error: firstError } = await supabase.from("studio_character_relationships").delete().eq("id", link.id);
    if (firstError) throw firstError;
    await supabase.from("studio_character_relationships").delete()
      .eq("source_character_id", link.target_character_id)
      .eq("target_character_id", link.source_character_id).eq("relationship_type", reverseType);
    await loadConnectedRelationships(link.source_character_id);
  } catch (failure) { setRelationshipError(failure instanceof Error ? failure.message : "Relationship could not be removed."); }
  finally { setRelationshipBusy(false); }
}

async function openConnectedCharacterProfile(target: StudioCharacterRow) {
  setSelectedCharacter(target); setProfileReturnPage("characters"); setPage("profile");
  await loadConnectedRelationships(target.id); window.scrollTo({ top: 0, behavior: "smooth" });
}


async function openConnections(saved: StudioCharacterRow) {
  setConnectionCenter(saved);
  setSelectedCharacter(saved);
  setConnectionView("family");
  setPage("connections");
  setLoadingConnections(true);
  setRelationshipError("");
  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    const { data, error: linkError } = await supabase
      .from("studio_character_relationships")
      .select("id, source_character_id, target_character_id, relationship_type")
      .eq("source_character_id", saved.id)
      .order("created_at", { ascending: true });

    if (linkError) throw linkError;
    const rows = (data ?? []) as CharacterRelationship[];
    const ids = rows.map((row) => row.target_character_id);

    if (!ids.length) {
      setConnectionLinks([]);
      return;
    }

    const { data: targets, error: targetError } = await supabase
      .from("studio_characters")
      .select("id, user_id, name, status, identity, appearance, origin_lore, abilities, relationships, media, portrait_url, current_step, is_complete, is_public, realm_record_id, race_record_id, faction_record_id, family_record_id, updated_at")
      .in("id", ids);

    if (targetError) throw targetError;
    const targetMap = new Map(((targets ?? []) as StudioCharacterRow[]).map((item) => [item.id, item]));
    setConnectionLinks(rows.map((row) => ({ ...row, target: targetMap.get(row.target_character_id) ?? null })));
  } catch (failure) {
    setRelationshipError(failure instanceof Error ? failure.message : "Connections could not be loaded.");
  } finally {
    setLoadingConnections(false);
  }
}

async function moveConnectionCenter(target: StudioCharacterRow) {
  await openConnections(target);
}

function returnFromConnections() {
  if (connectionCenter) {
    setSelectedCharacter(connectionCenter);
    setPage("profile");
    void loadConnectedRelationships(connectionCenter.id);
  } else {
    setPage("characters");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}


async function loadWorldRecords() {
  if (!session) return;
  setLoadingWorld(true);
  setWorldError("");
  try {
    const { data, error: loadError } = await supabase
      .from("studio_world_records")
      .select("id, user_id, record_type, name, subtype, description, emblem_url, cover_url, lore_details, is_public, created_at, updated_at")
      .order("name", { ascending: true });
    if (loadError) throw loadError;
    setWorldRecords((data ?? []) as WorldRecord[]);
  } catch (failure) {
    setWorldError(failure instanceof Error ? failure.message : "World records could not be loaded.");
  } finally {
    setLoadingWorld(false);
  }
}

function populateWorldEditor(record: WorldRecord | null) {
  setSelectedWorldRecord(record);
  setWorldEditName(record?.name ?? "");
  setWorldEditSubtype(record?.subtype ?? "");
  setWorldEditDescription(record?.description ?? "");
  setWorldEditCoverUrl(record?.cover_url ?? "");
  setWorldEditEmblemUrl(record?.emblem_url ?? "");
  setWorldEditLore({
    history: record?.lore_details?.history ?? "",
    culture: record?.lore_details?.culture ?? "",
    geography: record?.lore_details?.geography ?? "",
    magic: record?.lore_details?.magic ?? "",
    government: record?.lore_details?.government ?? "",
    notes: record?.lore_details?.notes ?? "",
  });
}

async function loadWorldRelations(recordId: string) {
  const { data, error: relationError } = await supabase
    .from("studio_world_relations")
    .select("id, source_record_id, target_record_id, relation_label")
    .eq("source_record_id", recordId)
    .order("created_at", { ascending: true });
  if (relationError) { setWorldError(relationError.message); return; }
  const rows = (data ?? []) as WorldRelation[];
  const ids = rows.map((row) => row.target_record_id);
  if (!ids.length) { setWorldRelated([]); return; }
  const { data: targets, error: targetError } = await supabase
    .from("studio_world_records")
    .select("id, user_id, record_type, name, subtype, description, emblem_url, cover_url, lore_details, is_public, created_at, updated_at")
    .in("id", ids);
  if (targetError) { setWorldError(targetError.message); return; }
  const map = new Map(((targets ?? []) as WorldRecord[]).map((item) => [item.id, item]));
  setWorldRelated(rows.map((row) => ({ ...row, target: map.get(row.target_record_id) ?? null })));
}

async function openWorldOrganization(record?: WorldRecord | null) {
  const next = record ?? null;
  populateWorldEditor(next);
  setPage("world");
  window.scrollTo({ top: 0, behavior: "smooth" });
  await Promise.all([loadWorldRecords(), loadMyCharacters()]);
  if (next) await loadWorldRelations(next.id);
  else setWorldRelated([]);
}

async function saveWorldDetails() {
  if (!session || !selectedWorldRecord || worldDetailBusy) return;
  setWorldDetailBusy(true); setWorldError("");
  try {
    const payload = {
      name: worldEditName.trim() || selectedWorldRecord.name,
      subtype: worldEditSubtype.trim() || null,
      description: worldEditDescription.trim() || null,
      cover_url: worldEditCoverUrl.trim() || null,
      emblem_url: worldEditEmblemUrl.trim() || null,
      lore_details: worldEditLore,
      updated_at: new Date().toISOString(),
    };
    const { data, error: updateError } = await supabase.from("studio_world_records")
      .update(payload).eq("id", selectedWorldRecord.id)
      .select("id, user_id, record_type, name, subtype, description, emblem_url, cover_url, lore_details, is_public, created_at, updated_at").single();
    if (updateError) throw updateError;
    populateWorldEditor(data as WorldRecord);
    await loadWorldRecords();
  } catch (failure) { setWorldError(failure instanceof Error ? failure.message : "Codex details could not be saved."); }
  finally { setWorldDetailBusy(false); }
}

async function uploadWorldImage(file: File, kind: "cover" | "emblem") {
  if (!session || !selectedWorldRecord) return;
  if (!file.type.startsWith("image/")) { setWorldError("Please choose an image file."); return; }
  if (file.size > 10 * 1024 * 1024) { setWorldError("Images must be 10 MB or smaller."); return; }
  setUploadingWorldMedia(kind); setWorldError("");
  try {
    const path = `${session.user.id}/${selectedWorldRecord.id}/${kind}/${Date.now()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("studio-codex-media").upload(path, file, { cacheControl:"3600", upsert:false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("studio-codex-media").getPublicUrl(path);
    if (kind === "cover") setWorldEditCoverUrl(data.publicUrl); else setWorldEditEmblemUrl(data.publicUrl);
  } catch (failure) { setWorldError(failure instanceof Error ? failure.message : "Codex image could not be uploaded."); }
  finally { setUploadingWorldMedia(null); }
}

async function addWorldRelation() {
  if (!session || !selectedWorldRecord || !worldRelatedTargetId || worldDetailBusy) return;
  if (worldRelatedTargetId === selectedWorldRecord.id) { setWorldError("A Codex entry cannot be related to itself."); return; }
  setWorldDetailBusy(true); setWorldError("");
  try {
    const base = { owner_user_id: session.user.id, relation_label: worldRelatedLabel.trim() || null };
    const { error: first } = await supabase.from("studio_world_relations").upsert({ ...base, source_record_id:selectedWorldRecord.id, target_record_id:worldRelatedTargetId }, { onConflict:"source_record_id,target_record_id" });
    if (first) throw first;
    const { error: reverse } = await supabase.from("studio_world_relations").upsert({ ...base, source_record_id:worldRelatedTargetId, target_record_id:selectedWorldRecord.id }, { onConflict:"source_record_id,target_record_id" });
    if (reverse) throw reverse;
    setWorldRelatedTargetId(""); setWorldRelatedLabel("");
    await loadWorldRelations(selectedWorldRecord.id);
  } catch (failure) { setWorldError(failure instanceof Error ? failure.message : "Related Codex entry could not be added."); }
  finally { setWorldDetailBusy(false); }
}

async function removeWorldRelation(link: WorldRelation) {
  if (!session || !selectedWorldRecord) return;
  await supabase.from("studio_world_relations").delete().eq("id", link.id);
  await supabase.from("studio_world_relations").delete().eq("source_record_id", link.target_record_id).eq("target_record_id", selectedWorldRecord.id);
  await loadWorldRelations(selectedWorldRecord.id);
}


async function loadWorldExplorer() {
  if (!session) return;
  setExplorerError("");
  try {
    const [atlasResult, locationsResult, timelineResult, favoritesResult] = await Promise.all([
      supabase.from("studio_world_atlases").select("id,user_id,title,map_url,description,is_public").limit(1).maybeSingle(),
      supabase.from("studio_world_locations").select("id,user_id,name,location_type,description,parent_location_id,codex_record_id,map_x,map_y,image_url,tags,is_public,archived_at,created_at,updated_at").order("name"),
      supabase.from("studio_timeline_events").select("id,user_id,title,era,display_date,sort_order,description,location_id,codex_record_id,character_id,image_url,tags,is_public,archived_at,created_at,updated_at").order("sort_order"),
      supabase.from("studio_favorites").select("item_type,item_id").eq("user_id", session.user.id),
    ]);
    if (atlasResult.error) throw atlasResult.error;
    if (locationsResult.error) throw locationsResult.error;
    if (timelineResult.error) throw timelineResult.error;
    if (favoritesResult.error) throw favoritesResult.error;
    setAtlas((atlasResult.data as WorldAtlas | null) ?? null);
    setWorldLocations((locationsResult.data ?? []) as WorldLocation[]);
    setTimelineEvents((timelineResult.data ?? []) as TimelineEvent[]);
    setFavoriteKeys(new Set((favoritesResult.data ?? []).map((x:any)=>`${x.item_type}:${x.item_id}`)));
  } catch (failure) { setExplorerError(failure instanceof Error ? failure.message : "World Explorer could not be loaded."); }
}

async function openWorldExplorer(tab: "map" | "locations" | "timeline" | "favorites" | "archive" = "map") {
  setExplorerTab(tab); setPage("explorer"); window.scrollTo({top:0,behavior:"smooth"});
  await Promise.all([loadWorldRecords(), loadMyCharacters(), loadWorldExplorer()]);
}

async function uploadWorldMap(file: File) {
  if (!session || uploadingMap) return;
  if (!file.type.startsWith("image/")) { setExplorerError("Please choose an image file."); return; }
  if (file.size > 15*1024*1024) { setExplorerError("World maps must be 15 MB or smaller."); return; }
  setUploadingMap(true); setExplorerError("");
  try {
    const path=`${session.user.id}/world-map/${Date.now()}-${safeFileName(file.name)}`;
    const {error:up}=await supabase.storage.from("studio-world-media").upload(path,file,{cacheControl:"3600",upsert:false}); if(up) throw up;
    const {data:urlData}=supabase.storage.from("studio-world-media").getPublicUrl(path);
    const payload={user_id:session.user.id,title:atlas?.title||"The Umbral World",map_url:urlData.publicUrl,description:atlas?.description||null,is_public:atlas?.is_public??false};
    const query=atlas ? supabase.from("studio_world_atlases").update(payload).eq("id",atlas.id).select().single() : supabase.from("studio_world_atlases").insert(payload).select().single();
    const {data,error}=await query; if(error) throw error; setAtlas(data as WorldAtlas);
  } catch(failure){setExplorerError(failure instanceof Error?failure.message:"World map could not be uploaded.");} finally{setUploadingMap(false);}
}

async function saveLocation() {
  if(!session||!locationForm.name.trim()||explorerBusy)return;
  setExplorerBusy(true); setExplorerError("");
  try {
    const normalized=locationForm.name.trim().toLowerCase();
    const duplicate=worldLocations.find(x=>!x.archived_at&&x.id!==editingLocationId&&x.name.trim().toLowerCase()===normalized&&x.parent_location_id===(locationForm.parentId||null));
    if(duplicate) throw new Error("A location with this name already exists at the same level.");
    const payload={name:locationForm.name.trim(),location_type:locationForm.locationType,description:locationForm.description.trim()||null,parent_location_id:locationForm.parentId||null,codex_record_id:locationForm.codexId||null,map_x:Math.max(0,Math.min(100,Number(locationForm.mapX)||50)),map_y:Math.max(0,Math.min(100,Number(locationForm.mapY)||50)),tags:locationForm.tags.split(",").map(x=>x.trim()).filter(Boolean),updated_at:new Date().toISOString()};
    const query=editingLocationId
      ? supabase.from("studio_world_locations").update(payload).eq("id",editingLocationId)
      : supabase.from("studio_world_locations").insert({...payload,user_id:session.user.id,is_public:false});
    const {error}=await query; if(error)throw error;
    cancelLocationEdit(); await loadWorldExplorer();
  } catch(failure){setExplorerError(failure instanceof Error?failure.message:"Location could not be saved.");}
  finally{setExplorerBusy(false);}
}

function editLocation(loc: WorldLocation){
  setEditingLocationId(loc.id); setExplorerTab("locations");
  setLocationForm({name:loc.name,locationType:loc.location_type,description:loc.description||"",parentId:loc.parent_location_id||"",codexId:loc.codex_record_id||"",mapX:String(loc.map_x??50),mapY:String(loc.map_y??50),tags:(loc.tags||[]).join(", ")});
  window.scrollTo({top:0,behavior:"smooth"});
}
function cancelLocationEdit(){setEditingLocationId(null);setLocationForm({name:"",locationType:"realm",description:"",parentId:"",codexId:"",mapX:"50",mapY:"50",tags:""});}

async function saveTimelineEvent() {
  if(!session||!eventForm.title.trim()||explorerBusy)return;
  setExplorerBusy(true); setExplorerError("");
  try {
    const normalized=eventForm.title.trim().toLowerCase();
    if(timelineEvents.some(x=>!x.archived_at&&x.id!==editingEventId&&x.title.trim().toLowerCase()===normalized&&String(x.display_date||"").toLowerCase()===eventForm.displayDate.trim().toLowerCase())) throw new Error("This timeline event already exists for that date label.");
    const payload={title:eventForm.title.trim(),era:eventForm.era.trim()||null,display_date:eventForm.displayDate.trim()||null,sort_order:Number(eventForm.sortOrder)||0,description:eventForm.description.trim()||null,location_id:eventForm.locationId||null,codex_record_id:eventForm.codexId||null,character_id:eventForm.characterId||null,tags:eventForm.tags.split(",").map(x=>x.trim()).filter(Boolean),updated_at:new Date().toISOString()};
    const query=editingEventId
      ? supabase.from("studio_timeline_events").update(payload).eq("id",editingEventId)
      : supabase.from("studio_timeline_events").insert({...payload,user_id:session.user.id,is_public:false});
    const {error}=await query; if(error)throw error;
    cancelEventEdit(); await loadWorldExplorer();
  } catch(failure){setExplorerError(failure instanceof Error?failure.message:"Timeline event could not be saved.");}
  finally{setExplorerBusy(false);}
}
function editTimelineEvent(ev: TimelineEvent){setEditingEventId(ev.id);setExplorerTab("timeline");setEventForm({title:ev.title,era:ev.era||"",displayDate:ev.display_date||"",sortOrder:String(ev.sort_order),description:ev.description||"",locationId:ev.location_id||"",codexId:ev.codex_record_id||"",characterId:ev.character_id||"",tags:(ev.tags||[]).join(", ")});window.scrollTo({top:0,behavior:"smooth"});}
function cancelEventEdit(){setEditingEventId(null);setEventForm({title:"",era:"",displayDate:"",sortOrder:"0",description:"",locationId:"",codexId:"",characterId:"",tags:""});}

async function toggleFavorite(itemType:string,itemId:string){ if(!session)return; const key=`${itemType}:${itemId}`; if(favoriteKeys.has(key)){await supabase.from("studio_favorites").delete().eq("user_id",session.user.id).eq("item_type",itemType).eq("item_id",itemId);}else{await supabase.from("studio_favorites").upsert({user_id:session.user.id,item_type:itemType,item_id:itemId},{onConflict:"user_id,item_type,item_id"});} await loadWorldExplorer(); }

async function archiveExplorerItem(table:"studio_world_locations"|"studio_timeline_events",id:string){if(!session)return;const {error}=await supabase.from(table).update({archived_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);if(error)setExplorerError(error.message);else{if(selectedLocationId===id)setSelectedLocationId("");await loadWorldExplorer();}}
async function restoreExplorerItem(table:"studio_world_locations"|"studio_timeline_events",id:string){if(!session)return;const {error}=await supabase.from(table).update({archived_at:null,updated_at:new Date().toISOString()}).eq("id",id);if(error)setExplorerError(error.message);else await loadWorldExplorer();}
async function permanentlyDeleteExplorerItem(table:"studio_world_locations"|"studio_timeline_events",id:string,label:string){if(!session||!confirm(`Permanently delete "${label}"? This cannot be undone.`))return;const {error}=await supabase.from(table).delete().eq("id",id);if(error)setExplorerError(error.message);else await loadWorldExplorer();}

function markerPositionFromPointer(e:any){const stage=e.currentTarget.parentElement as HTMLElement|null;if(!stage)return null;const r=stage.getBoundingClientRect();return{x:Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100)),y:Math.max(0,Math.min(100,((e.clientY-r.top)/r.height)*100))};}
function dragMapMarker(e:any,loc:WorldLocation){if(!draggingLocationId||draggingLocationId!==loc.id)return;const pos=markerPositionFromPointer(e);if(!pos)return;setWorldLocations(items=>items.map(x=>x.id===loc.id?{...x,map_x:pos.x,map_y:pos.y}:x));}
async function finishMapMarkerDrag(e:any,loc:WorldLocation){if(!session||draggingLocationId!==loc.id)return;const pos=markerPositionFromPointer(e);setDraggingLocationId(null);if(!pos)return;const {error}=await supabase.from("studio_world_locations").update({map_x:pos.x,map_y:pos.y,updated_at:new Date().toISOString()}).eq("id",loc.id);if(error)setExplorerError(error.message);else setLocationForm(v=>editingLocationId===loc.id?{...v,mapX:pos.x.toFixed(2),mapY:pos.y.toFixed(2)}:v);}

async function createWorldRecord() {
  if (!session || !worldFormName.trim() || worldSaving) return;
  setWorldSaving(true);
  setWorldError("");
  try {
    const { error: createError } = await supabase.from("studio_world_records").insert({
      user_id: session.user.id,
      record_type: worldFormType,
      name: worldFormName.trim(),
      subtype: worldFormSubtype.trim() || null,
      description: worldFormDescription.trim() || null,
      is_public: false,
    });
    if (createError) throw createError;
    setWorldFormName("");
    setWorldFormSubtype("");
    setWorldFormDescription("");
    await loadWorldRecords();
  } catch (failure) {
    setWorldError(failure instanceof Error ? failure.message : "The world record could not be created.");
  } finally {
    setWorldSaving(false);
  }
}

async function deleteWorldRecord(record: WorldRecord) {
  if (!session || !window.confirm(`Delete "${record.name}"? Characters keep their written text, but the structured link will be cleared.`)) return;
  setWorldError("");
  const { error: deleteError } = await supabase
    .from("studio_world_records")
    .delete()
    .eq("id", record.id);
  if (deleteError) { setWorldError(deleteError.message); return; }
  if (selectedWorldRecord?.id === record.id) setSelectedWorldRecord(null);
  await loadWorldRecords();
}

async function toggleWorldPublication(record: WorldRecord) {
  if (!session) return;
  const { error: updateError } = await supabase
    .from("studio_world_records")
    .update({ is_public: !record.is_public })
    .eq("id", record.id);
  if (updateError) { setWorldError(updateError.message); return; }
  await loadWorldRecords();
  if (selectedWorldRecord?.id === record.id) setSelectedWorldRecord({ ...record, is_public: !record.is_public });
}

function linkWorldRecord(kind: "realm" | "race" | "faction" | "family", id: string) {
  const record = worldRecords.find((item) => item.id === id);
  if (kind === "realm") {
    setLinkedRealmId(id);
    if (record) updateCharacter("homeland", record.name);
  } else if (kind === "race") {
    setLinkedRaceId(id);
    if (record) updateCharacter("race", record.name);
  } else if (kind === "faction") {
    setLinkedFactionId(id);
    if (record) updateCharacter("affiliation", record.name);
  } else {
    setLinkedFamilyId(id);
    if (record) updateCharacter("lineage", record.name);
  }
}

async function setCharacterPublication(saved: StudioCharacterRow, makePublic: boolean) {
  if (!session) return;
  setCharactersError("");
  const { error: publishError } = await supabase
    .from("studio_characters")
    .update({ is_public: makePublic })
    .eq("id", saved.id);

  if (publishError) {
    setCharactersError(publishError.message);
    return;
  }

  setStudioCharacters((current) =>
    current.map((item) => item.id === saved.id ? { ...item, is_public: makePublic } : item)
  );
  if (selectedCharacter?.id === saved.id) {
    setSelectedCharacter({ ...selectedCharacter, is_public: makePublic });
  }
}

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

async function ensureStudioCharacterId() {
  if (studioCharacterId) return studioCharacterId;
  if (!session) throw new Error("You must be signed in to upload media.");

  const record = buildStudioCharacterRecord(6, false);
  const { data, error: insertError } = await supabase
    .from("studio_characters")
    .insert(record)
    .select("id")
    .single();

  if (insertError) throw insertError;
  setStudioCharacterId(data.id);
  return data.id as string;
}

async function uploadCharacterImage(
  file: File,
  kind: "portrait" | "reference" | "alternate" | "gallery"
) {
  if (!session) return;
  if (!file.type.startsWith("image/")) {
    setMediaUploadError("Please choose an image file.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setMediaUploadError("Images must be 10 MB or smaller.");
    return;
  }

  setMediaUploadError("");
  setUploadingMedia(kind);

  try {
    const characterId = await ensureStudioCharacterId();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const path = `${session.user.id}/${characterId}/${kind}/${Date.now()}-${safeFileName(file.name || `image.${extension}`)}`;

    const { error: uploadError } = await supabase.storage
      .from("studio-character-media")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("studio-character-media").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    setCharacter((current) => {
      if (kind === "portrait") return { ...current, portraitUrl: publicUrl };
      if (kind === "reference") return { ...current, referenceArtUrl: publicUrl };
      if (kind === "alternate") return { ...current, alternateFormUrl: publicUrl };
      return { ...current, galleryUrls: [...current.galleryUrls, publicUrl] };
    });
  } catch (uploadFailure) {
    setMediaUploadError(uploadFailure instanceof Error ? uploadFailure.message : "The image could not be uploaded.");
  } finally {
    setUploadingMedia(null);
  }
}

function removeGalleryImage(url: string) {
  setCharacter((current) => ({
    ...current,
    galleryUrls: current.galleryUrls.filter((item) => item !== url),
  }));
}

async function deleteStudioCharacter(id: string, name: string) {
if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;

setCharactersError("");
const { error: deleteError } = await supabase
  .from("studio_characters")
  .delete()
  .eq("id", id);

if (deleteError) {
  setCharactersError(deleteError.message);
  return;
}

setStudioCharacters((current) => current.filter((item) => item.id !== id));
}

function openCreateCharacter() {
setCreatorStep(1);
setStudioCharacterId(null);
setSaveError("");
setConnectedRelationships([]);
setLinkedRealmId("");
setLinkedRaceId("");
setLinkedFactionId("");
setLinkedFamilyId("");
void loadRelationshipOptions(null);
void loadWorldRecords();
setCharacter({
  name: "",
  alias: "",
  nicknames: "",
  titles: "",
  pronunciation: "",
  nameMeaning: "",
  birthDate: "",
  elementalHeritage: "",
  canonStatus: "",
  spoilerLevel: "",
  era: "",
  age: "",
  apparentAge: "",
  pronouns: "",
  subrace: "",
  heritage: "",
  nationality: "",
  currentResidence: "",
  occupation: "",
  race: "",
  gender: "",
  homeland: "",
  affiliation: "",
  summary: "",
  skinTone: "",
  skinHex: "",
  faceDetails: "",
  eyeColor: "",
  eyeHex: "",
  hairColor: "",
  hairHex: "",
  hairTexture: "",
  hairStyle: "",
  height: "",
  weight: "",
  dominantHand: "",
  build: "",
  postureMovement: "",
  distinguishingFeatures: "",
  makeup: "",
  grooming: "",
  nails: "",
  colorPalette: "",
  signatureOutfit: "",
  outfitColors: "",
  outfitMaterials: "",
  wardrobe: "",
  clothingStyle: "",
  accessories: "",
  alternateForm: "",
  appearanceNotes: "",
  birthplace: "",
  lineage: "",
  culture: "",
  childhood: "",
  backstory: "",
  majorLifeEvents: "",
  personality: "",
  voiceSpeech: "",
  psychology: "",
  lifestyle: "",
  likesDislikes: "",
  motivations: "",
  goals: "",
  fears: "",
  beliefs: "",
  storyRole: "",
  storyArc: "",
  powerSource: "",
  primaryAbilities: "",
  secondaryAbilities: "",
  signatureTechniques: "",
  weapons: "",
  weaponDetails: "",
  transformations: "",
  transformationDetails: "",
  strengths: "",
  weaknesses: "",
  limitations: "",
  combatStyle: "",
  combatProfile: "",
  abilityNotes: "",
  parents: "",
  siblings: "",
  children: "",
  partner: "",
  allies: "",
  rivals: "",
  enemies: "",
  mentors: "",
  relationshipNotes: "",
  worldConnections: "",
  visualAssets: "",
  productionNotes: "",
  canonLocks: "",
  tbdFields: "",
  portraitUrl: "",
  referenceArtUrl: "",
  alternateFormUrl: "",
  galleryUrl: "",
  galleryUrls: [] as string[],
  mediaNotes: "",
});
setPage("create");
window.scrollTo({ top: 0, behavior: "smooth" });
}

function returnToDashboard() {
setPage("dashboard");
window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateCharacter(field: keyof typeof character, value: string | string[]) {
setCharacter((current) => ({
  ...current,
  [field]: value,
}));
}

function buildStudioCharacterRecord(currentStep: number, complete = false) {
return {
  user_id: session!.user.id,
  name: character.name.trim() || "Unnamed Character",
  status: complete ? "complete" : "draft",
  identity: {
    name: character.name,
    alias: character.alias,
    nicknames: character.nicknames,
    titles: character.titles,
    pronunciation: character.pronunciation,
    nameMeaning: character.nameMeaning,
    birthDate: character.birthDate,
    elementalHeritage: character.elementalHeritage,
    canonStatus: character.canonStatus,
    spoilerLevel: character.spoilerLevel,
    era: character.era,
    age: character.age,
    apparentAge: character.apparentAge,
    pronouns: character.pronouns,
    subrace: character.subrace,
    heritage: character.heritage,
    nationality: character.nationality,
    currentResidence: character.currentResidence,
    occupation: character.occupation,
    race: character.race,
    gender: character.gender,
    homeland: character.homeland,
    affiliation: character.affiliation,
    summary: character.summary,
  },
  appearance: {
    skinTone: character.skinTone,
    skinHex: character.skinHex,
    faceDetails: character.faceDetails,
    eyeColor: character.eyeColor,
    eyeHex: character.eyeHex,
    hairColor: character.hairColor,
    hairHex: character.hairHex,
    hairTexture: character.hairTexture,
    hairStyle: character.hairStyle,
    height: character.height,
    weight: character.weight,
    dominantHand: character.dominantHand,
    build: character.build,
    postureMovement: character.postureMovement,
    distinguishingFeatures: character.distinguishingFeatures,
    makeup: character.makeup,
    grooming: character.grooming,
    nails: character.nails,
    colorPalette: character.colorPalette,
    signatureOutfit: character.signatureOutfit,
    outfitColors: character.outfitColors,
    outfitMaterials: character.outfitMaterials,
    wardrobe: character.wardrobe,
    clothingStyle: character.clothingStyle,
    accessories: character.accessories,
    alternateForm: character.alternateForm,
    appearanceNotes: character.appearanceNotes,
  },
  origin_lore: {
    birthplace: character.birthplace,
    lineage: character.lineage,
    culture: character.culture,
    childhood: character.childhood,
    backstory: character.backstory,
    majorLifeEvents: character.majorLifeEvents,
    personality: character.personality,
    voiceSpeech: character.voiceSpeech,
    psychology: character.psychology,
    lifestyle: character.lifestyle,
    likesDislikes: character.likesDislikes,
    motivations: character.motivations,
    goals: character.goals,
    fears: character.fears,
    beliefs: character.beliefs,
    storyRole: character.storyRole,
    storyArc: character.storyArc,
  },
  abilities: {
    powerSource: character.powerSource,
    primaryAbilities: character.primaryAbilities,
    secondaryAbilities: character.secondaryAbilities,
    signatureTechniques: character.signatureTechniques,
    weapons: character.weapons,
    weaponDetails: character.weaponDetails,
    transformations: character.transformations,
    transformationDetails: character.transformationDetails,
    strengths: character.strengths,
    weaknesses: character.weaknesses,
    limitations: character.limitations,
    combatStyle: character.combatStyle,
    combatProfile: character.combatProfile,
    abilityNotes: character.abilityNotes,
  },
  relationships: {
    parents: character.parents,
    siblings: character.siblings,
    children: character.children,
    partner: character.partner,
    allies: character.allies,
    rivals: character.rivals,
    enemies: character.enemies,
    mentors: character.mentors,
    relationshipNotes: character.relationshipNotes,
    worldConnections: character.worldConnections,
  },
  media: {
    portraitUrl: character.portraitUrl,
    referenceArtUrl: character.referenceArtUrl,
    alternateFormUrl: character.alternateFormUrl,
    galleryUrl: character.galleryUrl,
    galleryUrls: character.galleryUrls,
    mediaNotes: character.mediaNotes,
    visualAssets: character.visualAssets,
    productionNotes: character.productionNotes,
    canonLocks: character.canonLocks,
    tbdFields: character.tbdFields,
  },
  portrait_url: character.portraitUrl.trim() || null,
  current_step: currentStep,
  is_complete: complete,
  realm_record_id: linkedRealmId || null,
  race_record_id: linkedRaceId || null,
  faction_record_id: linkedFactionId || null,
  family_record_id: linkedFamilyId || null,
};
}

async function saveCharacter(nextStep: number, complete = false) {
if (!session || savingCharacter) return;

setSaveError("");
setSavingCharacter(true);

try {
  const record = buildStudioCharacterRecord(nextStep, complete);

  if (studioCharacterId) {
    const { error: updateError } = await supabase
      .from("studio_characters")
      .update(record)
      .eq("id", studioCharacterId);

    if (updateError) throw updateError;
  } else {
    const { data, error: insertError } = await supabase
      .from("studio_characters")
      .insert(record)
      .select("id")
      .single();

    if (insertError) throw insertError;
    setStudioCharacterId(data.id);
  }

  if (complete) {
    setPage("dashboard");
    setCreatorStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    setCreatorStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
} catch (saveFailure) {
  const message =
    saveFailure instanceof Error
      ? saveFailure.message
      : "Your character could not be saved.";
  setSaveError(message);
} finally {
  setSavingCharacter(false);
}
}

function goToCreatorStep(step: number) {
setCreatorStep(step);
setSaveError("");
window.scrollTo({ top: 0, behavior: "smooth" });
}

// Build-compatibility references: these V10 capabilities are retained for the next UI pass.
void databaseLocks; void setMyStudioDisplayName; void setMyDisplayName; void openPublicEncyclopedia;

if (loading) {
return ( <main className="studio-shell"> <div className="studio-card"> <div className="moon">☾</div>

      <p className="eyebrow">UMBRA CONNECT</p>

      <h1>Umbra Studio</h1>

      <p className="subtitle">
        Your gateway to the Umbral World.
      </p>

      <div className="divider" />

      <p className="status">
        Preparing your connection to Umbra Connect...
      </p>
    </div>
  </main>
);

}

if (!session && publicBrowse) {
 const q=publicBrowseSearch.toLowerCase();
 const shown=publicBrowseRecords.filter(r=>[r.name,r.subtitle,r.summary,r.record_code].filter(Boolean).join(" ").toLowerCase().includes(q));
 const shownChars=publicBrowseCharacters.filter(r=>[r.name,r.identity?.alias,r.identity?.race,r.identity?.homeland,r.identity?.summary].filter(Boolean).join(" ").toLowerCase().includes(q));
 const shownWorld=publicBrowseWorld.filter(r=>[r.name,r.subtype,r.description,r.record_type].filter(Boolean).join(" ").toLowerCase().includes(q));
 const shownLoc=publicBrowseLocations.filter(r=>[r.name,r.location_type,r.description,...(r.tags||[])].filter(Boolean).join(" ").toLowerCase().includes(q));
 const shownTime=publicBrowseTimeline.filter(r=>[r.title,r.era,r.display_date,r.description,...(r.tags||[])].filter(Boolean).join(" ").toLowerCase().includes(q));
 return (<main className="public-encyclopedia-page"><header className="studio-header"><div className="brand"><div className="brand-moon">☾</div><div><p className="header-eyebrow">UMBRA CONNECT</p><h2>{publicBrowseSettings?.title||"The Umbral World"}</h2></div></div><button className="back-button" onClick={()=>setPublicBrowse(false)}>Studio Sign In</button></header><section className="public-encyclopedia-shell"><div className="public-encyclopedia-hero" style={publicBrowseSettings?.hero_image_url?{backgroundImage:`linear-gradient(rgba(7,4,12,.65),rgba(7,4,12,.96)),url(${publicBrowseSettings.hero_image_url})`}:undefined}><p className="eyebrow">PUBLIC UMBRA ENCYCLOPEDIA • V2</p><h1>{publicBrowseSettings?.title||"The Umbral World"}</h1><h3>{publicBrowseSettings?.subtitle||"Explore published canon from Umbra Connect."}</h3><p>{publicBrowseSettings?.introduction||"Discover the people, places, powers, histories, and artifacts of the Umbral World."}</p><input type="search" value={publicBrowseSearch} onChange={e=>setPublicBrowseSearch(e.target.value)} placeholder="Search published characters, lore, places, and history..."/></div><nav className="public-v9-tabs">{(["lore","characters","codex","locations","timeline"] as const).map(t=><button className={publicBrowseTab===t?"active":""} key={t} onClick={()=>setPublicBrowseTab(t)}>{t}</button>)}</nav>
 {publicBrowseTab==="lore"&&<div className="v8-encyclopedia-grid public-grid">{shown.map(r=><article key={r.id}>{r.image_url&&<img src={r.image_url} alt=""/>}<span>{publicBrowseTypes.find(t=>t.id===r.record_type_id)?.name||"Lore"}</span><h3>{r.name}</h3>{r.subtitle&&<strong>{r.subtitle}</strong>}<p>{r.summary||""}</p><small>{r.record_code} • {(r.canon_status||"").replace(/_/g," ")}</small>{Object.entries(r.details||{}).slice(0,6).map(([k,v])=><details key={k}><summary>{k}</summary><p>{typeof v==="string"?v:JSON.stringify(v)}</p></details>)}</article>)}</div>}
 {publicBrowseTab==="characters"&&<div className="v8-encyclopedia-grid public-grid">{shownChars.map(c=><article key={c.id}>{c.portrait_url&&<img src={c.portrait_url} alt=""/>}<span>Character</span><h3>{c.name}</h3><strong>{[c.identity?.race,c.identity?.homeland].filter(Boolean).join(" • ")}</strong><p>{c.identity?.summary||c.origin_lore?.backstory||""}</p>{c.abilities?.primaryAbilities&&<details><summary>Abilities</summary><p>{c.abilities.primaryAbilities}</p></details>}</article>)}</div>}
 {publicBrowseTab==="codex"&&<div className="v8-encyclopedia-grid public-grid">{shownWorld.map(w=><article key={w.id}>{(w.cover_url||w.emblem_url)&&<img src={w.cover_url||w.emblem_url||""} alt=""/>}<span>{w.record_type}</span><h3>{w.name}</h3>{w.subtype&&<strong>{w.subtype}</strong>}<p>{w.description||""}</p>{Object.entries(w.lore_details||{}).slice(0,6).map(([k,v])=><details key={k}><summary>{k}</summary><p>{v}</p></details>)}</article>)}</div>}
 {publicBrowseTab==="locations"&&<div className="v8-encyclopedia-grid public-grid">{shownLoc.map(l=><article key={l.id}>{l.image_url&&<img src={l.image_url} alt=""/>}<span>{l.location_type}</span><h3>{l.name}</h3><p>{l.description||""}</p>{l.tags?.length?<small>{l.tags.join(" • ")}</small>:null}</article>)}</div>}
 {publicBrowseTab==="timeline"&&<div className="public-v9-timeline">{shownTime.map(e=><article key={e.id}>{e.image_url&&<img src={e.image_url} alt=""/>}<div><span>{e.era||"Era unknown"}{e.display_date?` • ${e.display_date}`:""}</span><h3>{e.title}</h3><p>{e.description||""}</p></div></article>)}</div>}
 {((publicBrowseTab==="lore"&&shown.length===0)||(publicBrowseTab==="characters"&&shownChars.length===0)||(publicBrowseTab==="codex"&&shownWorld.length===0)||(publicBrowseTab==="locations"&&shownLoc.length===0)||(publicBrowseTab==="timeline"&&shownTime.length===0))&&<p className="admin-empty">No published encyclopedia entries match this search.</p>}
 </section></main>);
}

if (!session) {
return ( <main className="studio-shell"> <div className="studio-card login-card"> <div className="moon">☾</div>

      <p className="eyebrow">UMBRA CONNECT</p>

      <h1>Umbra Studio</h1>

      <p className="subtitle">
        Sign in with your Umbra Connect account.
      </p>

      <div className="divider" />

      <form
        className="login-form"
        onSubmit={handleSignIn}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="login-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={signingIn}
        >
          {signingIn
            ? "Entering..."
            : "Enter Umbra Studio"}
        </button>
      </form>

      <p className="status">
        Connected to Umbra Connect
      </p>
    </div>
  </main>
);

}

if (!studioAccessChecked) {
return (<main className="studio-shell"><div className="studio-card"><div className="moon">☾</div><p className="eyebrow">UMBRA CONNECT</p><h1>Umbra Studio</h1><p className="subtitle">Checking Studio authorization...</p><div className="divider"/><p className="status">Studio access is invitation-only.</p></div></main>);
}

if (!studioAccessRole) {
return (<main className="studio-shell"><div className="studio-card access-denied-card"><div className="moon">☾</div><p className="eyebrow">PRIVATE CREATIVE DATABASE</p><h1>Access Restricted</h1><p className="subtitle">Your Umbra Connect account is valid, but it has not been authorized for Umbra Studio.</p><div className="divider"/><p className="status">A Primary Admin must add your account as Primary Admin, Admin, or Editor before Studio data can be accessed.</p><button className="sign-out-button access-signout" onClick={()=>void handleSignOut()}>Sign Out</button></div></main>);
}

if (page === "characters") {
return (
  <main className="dashboard-shell">
    <style>{`
      .my-characters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
        gap: 24px;
        margin-top: 32px;
      }
      .saved-character-card {
        min-width: 0;
        overflow: hidden;
        border: 1px solid rgba(185, 92, 209, .24);
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(29, 12, 31, .96), rgba(10, 6, 14, .98));
        box-shadow: 0 20px 50px rgba(0,0,0,.22);
      }
      .saved-character-image {
        height: 280px;
        position: relative;
        overflow: hidden;
        background: radial-gradient(circle at 50% 40%, rgba(105, 35, 119, .35), rgba(8, 5, 12, 1) 70%);
      }
      .saved-character-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .saved-character-placeholder {
        height: 100%;
        display: grid;
        place-items: center;
        font-size: 72px;
        color: #e5bd57;
      }
      .character-status {
        position: absolute;
        top: 16px;
        right: 16px;
        padding: 7px 11px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
        background: rgba(8, 5, 12, .86);
        border: 1px solid rgba(229, 189, 87, .35);
        color: #e8c96f;
      }
      .character-status.complete { color: #f1d878; }
      .saved-character-body { min-width: 0; padding: 24px; }
      .saved-character-body h3 {
        margin: 8px 0 4px;
        font-family: Georgia, serif;
        font-size: 28px;
        color: #f0d481;
      }
      .saved-character-body strong {
        display: block;
        margin-bottom: 12px;
        color: #d7bddb;
      }
      .saved-character-body p {
        min-height: 52px;
        color: #a991ad;
        line-height: 1.65;
      }
      .saved-character-progress { margin: 22px 0; }
      .saved-character-progress > div:first-child {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        color: #9d849f;
        font-size: 12px;
      }
      .saved-character-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        align-items: stretch;
        width: 100%;
        min-width: 0;
      }
      .saved-character-actions button {
        width: 100%;
        min-width: 0;
        min-height: 54px;
        padding: 11px 12px;
        white-space: normal;
        overflow-wrap: anywhere;
        line-height: 1.25;
      }
      .saved-character-actions .primary-action { width: 100%; }
      .danger-action { color: #d79aa7 !important; }
      @media (max-width: 700px) {
        .my-characters-grid { grid-template-columns: 1fr; }
        .saved-character-actions { grid-template-columns: 1fr; }
      }
    `}</style>
    <header className="studio-header">
      <div className="brand">
        <div className="brand-moon">☾</div>
        <div>
          <p className="header-eyebrow">UMBRA CONNECT</p>
          <h2>Umbra Studio</h2>
        </div>
      </div>

      <div className="account-area">
        <button type="button" className="sign-out-button" onClick={returnToDashboard}>
          ← Back to Studio
        </button>
      </div>
    </header>

    <section className="dashboard-content">
      <div className="welcome-section">
        <p className="eyebrow">YOUR CREATIONS</p>
        <h1>My Characters</h1>
        <p>Continue developing your saved souls or return to a completed character.</p>
      </div>

      {charactersError && (
        <p className="login-error" role="alert">{charactersError}</p>
      )}

      {loadingCharacters ? (
        <div className="studio-footer-card">
          <strong>Loading your characters...</strong>
        </div>
      ) : studioCharacters.length === 0 ? (
        <div className="studio-footer-card">
          <div>
            <span className="connected-check">✦</span>
            <strong>No characters yet</strong>
          </div>
          <p>Create your first character and it will appear here automatically.</p>
          <button type="button" className="primary-action" onClick={openCreateCharacter}>
            Create Character →
          </button>
        </div>
      ) : (
        <div className="my-characters-grid">
          {studioCharacters.map((saved) => {
            const identity = saved.identity ?? {};
            const appearance = saved.appearance ?? {};
            const portrait = saved.portrait_url || saved.media?.portraitUrl || "";
            const step = Math.min(6, Math.max(1, saved.current_step ?? 1));
            const progress = saved.is_complete ? 100 : Math.round((step / 6) * 100);

            return (
              <article className="saved-character-card" key={saved.id}>
                <div className="saved-character-image">
                  {portrait ? (
                    <img src={portrait} alt={`${saved.name} portrait`} />
                  ) : (
                    <div className="saved-character-placeholder">☾</div>
                  )}
                  <span className={`character-status ${saved.is_complete ? "complete" : "draft"}`}>
                    {saved.is_complete ? (saved.is_public ? "Published" : "Complete") : "Draft"}
                  </span>
                </div>

                <div className="saved-character-body">
                  <span className="creator-kicker">
                    {identity.race || appearance.alternateForm || "UMBRAL CHARACTER"}
                  </span>
                  <h3>{saved.name || "Unnamed Character"}</h3>
                  {identity.alias && <strong>{identity.alias}</strong>}
                  <p>
                    {identity.summary ||
                      [identity.homeland, identity.affiliation].filter(Boolean).join(" • ") ||
                      "This character is waiting for their story to unfold."}
                  </p>

                  <div className="saved-character-progress">
                    <div>
                      <span>{saved.is_complete ? "Profile complete" : `Step ${step} of 6`}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="creator-progress-track">
                      <div className="creator-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="saved-character-actions">
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => openCharacterProfile(saved, "characters")}
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      className="primary-action"
                      onClick={() => loadCharacterIntoEditor(saved)}
                    >
                      {saved.is_complete ? "View / Edit Character" : "Continue Editing →"}
                    </button>
                    {saved.is_complete && (
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => setCharacterPublication(saved, !saved.is_public)}
                      >
                        {saved.is_public ? "Unpublish" : "Publish"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="secondary-action danger-action"
                      onClick={() => deleteStudioCharacter(saved.id, saved.name || "Unnamed Character")}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  </main>
);
}

if (page === "library") {
const races = Array.from(new Set(libraryCharacters.map((item) => item.identity?.race).filter(Boolean) as string[])).sort();
const homelands = Array.from(new Set(libraryCharacters.map((item) => item.identity?.homeland).filter(Boolean) as string[])).sort();
const affiliations = Array.from(new Set(libraryCharacters.map((item) => item.identity?.affiliation).filter(Boolean) as string[])).sort();
const normalizedSearch = librarySearch.trim().toLowerCase();
const filteredLibraryCharacters = libraryCharacters.filter((item) => {
  const identity = item.identity ?? {};
  const searchable = [item.name, identity.alias, identity.race, identity.homeland, identity.affiliation, identity.summary]
    .filter(Boolean).join(" ").toLowerCase();
  return (!normalizedSearch || searchable.includes(normalizedSearch))
    && (!libraryRace || identity.race === libraryRace)
    && (!libraryHomeland || identity.homeland === libraryHomeland)
    && (!libraryAffiliation || identity.affiliation === libraryAffiliation);
});
return (
  <main className="dashboard-shell">
    <style>{`
      .library-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:24px; margin-top:32px; }
      .library-card { overflow:hidden; border:1px solid rgba(185,92,209,.24); border-radius:22px; background:linear-gradient(180deg,rgba(29,12,31,.96),rgba(10,6,14,.98)); box-shadow:0 20px 50px rgba(0,0,0,.22); }
      .library-image { height:320px; overflow:hidden; position:relative; background:radial-gradient(circle at 50% 40%,rgba(105,35,119,.35),rgba(8,5,12,1) 70%); }
      .library-image img { width:100%; height:100%; object-fit:cover; }
      .library-placeholder { height:100%; display:grid; place-items:center; font-size:76px; color:#e5bd57; }
      .library-badge { position:absolute; top:16px; right:16px; padding:7px 11px; border-radius:999px; background:rgba(8,5,12,.86); border:1px solid rgba(229,189,87,.35); color:#f1d878; font-size:11px; font-weight:800; letter-spacing:.12em; }
      .library-body { padding:24px; }
      .library-body h3 { margin:8px 0 4px; font-family:Georgia,serif; font-size:28px; color:#f0d481; }
      .library-body strong { display:block; margin-bottom:12px; color:#d7bddb; }
      .library-body p { color:#a991ad; line-height:1.65; }
      .library-meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
      .library-meta span { padding:6px 10px; border-radius:999px; border:1px solid rgba(185,92,209,.2); color:#bca1c0; font-size:12px; }
      .library-controls{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:12px;margin-top:28px}
      .library-controls input,.library-controls select{width:100%;box-sizing:border-box;padding:13px 14px;border-radius:12px;border:1px solid rgba(185,92,209,.24);background:#110914;color:#e8dfea}
      .library-results{margin-top:14px;color:#9f8ba2;font-size:13px}
      @media(max-width:900px){.library-controls{grid-template-columns:1fr 1fr}}
      @media(max-width:700px){.library-grid{grid-template-columns:1fr}.library-controls{grid-template-columns:1fr}}
    `}</style>
    <header className="studio-header">
      <div className="brand"><div className="brand-moon">☾</div><div><p className="header-eyebrow">UMBRA CONNECT</p><h2>Umbra Studio</h2></div></div>
      <div className="account-area"><button type="button" className="sign-out-button" onClick={returnToDashboard}>← Back to Studio</button></div>
    </header>
    <section className="dashboard-content">
      <div className="welcome-section">
        <p className="eyebrow">EXPLORE THE UMBRAL WORLD</p>
        <h1>Character Library</h1>
        <p>Discover characters their creators have chosen to publish to the Umbral World.</p>
      </div>
      <div className="library-controls">
        <input type="search" placeholder="Search name, alias, lore..." value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} />
        <select value={libraryRace} onChange={(e) => setLibraryRace(e.target.value)}><option value="">All races</option>{races.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={libraryHomeland} onChange={(e) => setLibraryHomeland(e.target.value)}><option value="">All homelands</option>{homelands.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={libraryAffiliation} onChange={(e) => setLibraryAffiliation(e.target.value)}><option value="">All affiliations</option>{affiliations.map((value) => <option key={value} value={value}>{value}</option>)}</select>
      </div>
      {!loadingLibrary && <div className="library-results">{filteredLibraryCharacters.length} character{filteredLibraryCharacters.length === 1 ? "" : "s"} found</div>}
      {libraryError && <p className="login-error" role="alert">{libraryError}</p>}
      {loadingLibrary ? (
        <div className="studio-footer-card"><strong>Opening the Character Library...</strong></div>
      ) : libraryCharacters.length === 0 ? (
        <div className="studio-footer-card"><div><span className="connected-check">✦</span><strong>The Library is waiting for its first published soul</strong></div><p>Characters appear here only after their creator publishes them.</p></div>
      ) : filteredLibraryCharacters.length === 0 ? (
        <div className="studio-footer-card"><div><span className="connected-check">✦</span><strong>No characters match those filters</strong></div><p>Try clearing a search term or filter.</p></div>
      ) : (
        <div className="library-grid">
          {filteredLibraryCharacters.map((saved) => {
            const identity = saved.identity ?? {};
            const appearance = saved.appearance ?? {};
            const portrait = saved.portrait_url || saved.media?.portraitUrl || "";
            return (
              <article className="library-card" key={saved.id}>
                <div className="library-image">
                  {portrait ? <img src={portrait} alt={`${saved.name} portrait`} /> : <div className="library-placeholder">☾</div>}
                  <span className="library-badge">COMPLETE</span>
                </div>
                <div className="library-body">
                  <span className="creator-kicker">{identity.race || appearance.alternateForm || "UMBRAL CHARACTER"}</span>
                  <h3>{saved.name || "Unnamed Character"}</h3>
                  {identity.alias && <strong>{identity.alias}</strong>}
                  <p>{identity.summary || [identity.homeland, identity.affiliation].filter(Boolean).join(" • ") || "A completed character of the Umbral World."}</p>
                  <div className="library-meta">
                    {identity.race && <span>{identity.race}</span>}
                    {identity.homeland && <span>{identity.homeland}</span>}
                    {identity.affiliation && <span>{identity.affiliation}</span>}
                  </div>
                  <button
                    type="button"
                    className="primary-action library-profile-button"
                    onClick={() => openCharacterProfile(saved, "library")}
                  >
                    View Full Profile →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  </main>
);
}



if (page === "explorer") {
const q=explorerSearch.trim().toLowerCase();
const activeLocations=worldLocations.filter(x=>!x.archived_at);
const activeEvents=timelineEvents.filter(x=>!x.archived_at);
const archivedLocations=worldLocations.filter(x=>!!x.archived_at);
const archivedEvents=timelineEvents.filter(x=>!!x.archived_at);
const visibleLocations=activeLocations.filter(x=>!q||[x.name,x.location_type,x.description,...(x.tags||[])].filter(Boolean).join(" ").toLowerCase().includes(q));
const visibleEvents=activeEvents.filter(x=>!q||[x.title,x.era,x.display_date,x.description,...(x.tags||[])].filter(Boolean).join(" ").toLowerCase().includes(q));
const locationById=new Map<string, WorldLocation>(worldLocations.map(x=>[x.id,x])); const codexById=new Map<string, WorldRecord>(worldRecords.map(x=>[x.id,x])); const charById=new Map<string, StudioCharacterRow>(studioCharacters.map(x=>[x.id,x]));
return <main className="dashboard-shell explorer-page">
<header className="studio-header"><button className="brand-button" onClick={returnToDashboard}><div className="brand-moon">☾</div><div className="brand-button-copy"><span className="header-eyebrow">UMBRA CONNECT</span><strong>World Explorer</strong></div></button><button className="sign-out-button" onClick={returnToDashboard}>← Back to Studio</button></header>
<section className="explorer-shell">
<div className="explorer-heading"><div><p className="eyebrow">MAP • HISTORY • LORE</p><h1>World Explorer</h1><p>Navigate, edit, archive, restore, and chronicle the Umbral World from one workspace.</p></div><input className="explorer-search" type="search" value={explorerSearch} onChange={e=>setExplorerSearch(e.target.value)} placeholder="Search locations, eras, tags, lore..."/></div>
<div className="explorer-stats"><div><strong>{activeLocations.length}</strong><span>Active Locations</span></div><div><strong>{activeEvents.length}</strong><span>Timeline Events</span></div><div><strong>{worldRecords.length}</strong><span>Codex Entries</span></div><div><strong>{favoriteKeys.size}</strong><span>Favorites</span></div></div>
<nav className="explorer-tabs">{([['map','World Map'],['locations','Locations'],['timeline','Timeline'],['favorites','Favorites'],['archive',`Archive (${archivedLocations.length+archivedEvents.length})`]] as const).map(([id,label])=><button key={id} className={explorerTab===id?'active':''} onClick={()=>setExplorerTab(id)}>{label}</button>)}</nav>
{explorerError&&<p className="login-error">{explorerError}</p>}
{explorerTab==='map'&&<><section className="map-manager"><div><span className="creator-kicker">INTERACTIVE ATLAS</span><h2>{atlas?.title||'The Umbral World'}</h2><p>Drag any marker directly across the map. Its coordinates save when you release it.</p></div><label className="map-upload-button">{uploadingMap?'Uploading Map...':'Upload / Replace World Map'}<input hidden type="file" accept="image/*" disabled={uploadingMap} onChange={e=>{const f=e.target.files?.[0];if(f)void uploadWorldMap(f);e.currentTarget.value='';}}/></label></section><div className={`atlas-stage ${draggingLocationId?'dragging':''}`}>{atlas?.map_url?<img className="atlas-image" src={atlas.map_url} alt={atlas.title}/>:<div className="atlas-empty"><span>☾</span><h3>Your Umbral World map goes here</h3><p>Upload the map artwork above. Location markers will appear over it.</p></div>}{atlas?.map_url&&visibleLocations.filter(x=>x.map_x!==null&&x.map_y!==null).map(loc=><button key={loc.id} className={`map-marker ${selectedLocationId===loc.id?'active':''}`} style={{left:`${loc.map_x}%`,top:`${loc.map_y}%`}} onPointerDown={(e:any)=>{e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);setSelectedLocationId(loc.id);setDraggingLocationId(loc.id)}} onPointerMove={(e:any)=>dragMapMarker(e,loc)} onPointerUp={(e:any)=>void finishMapMarkerDrag(e,loc)} title={`Drag ${loc.name}`}><span>✦</span><b>{loc.name}</b></button>)}</div>{selectedLocationId&&locationById.get(selectedLocationId)&&!locationById.get(selectedLocationId)!.archived_at&&(()=>{const loc=locationById.get(selectedLocationId)!;const codex=loc.codex_record_id?codexById.get(loc.codex_record_id):null;return <section className="selected-location-card"><div><span className="world-type">{loc.location_type}</span><h3>{loc.name}</h3><p>{loc.description||'No location lore yet.'}</p>{loc.parent_location_id&&<small>Inside: {(loc.parent_location_id ? locationById.get(loc.parent_location_id)?.name : null)||'Parent location'}</small>}</div><div className="world-actions">{codex&&<button className="primary-action" onClick={()=>void openWorldOrganization(codex)}>Open Codex</button>}<button className="secondary-action" onClick={()=>editLocation(loc)}>Edit</button><button className="secondary-action" onClick={()=>void toggleFavorite('location',loc.id)}>{favoriteKeys.has(`location:${loc.id}`)?'★ Favorited':'☆ Favorite'}</button></div></section>})()}</>}
{explorerTab==='locations'&&<><section className={`explorer-form ${editingLocationId?'editing-form':''}`}><span className="creator-kicker">{editingLocationId?'EDIT LOCATION':'BUILD THE WORLD HIERARCHY'}</span><h2>{editingLocationId?'Update Location':'Add Location'}</h2>{editingLocationId&&<p className="edit-notice">You are editing an existing location. Save changes or cancel to return to creation mode.</p>}<div className="explorer-form-grid"><input value={locationForm.name} onChange={e=>setLocationForm(v=>({...v,name:e.target.value}))} placeholder="Location name"/><select value={locationForm.locationType} onChange={e=>setLocationForm(v=>({...v,locationType:e.target.value}))}><option value="continent">Continent</option><option value="realm">Realm</option><option value="region">Region / Territory</option><option value="city">City / Settlement</option><option value="landmark">Landmark</option><option value="ocean">Ocean / Sea</option><option value="island">Island</option><option value="sanctuary">Sanctuary</option></select><select value={locationForm.parentId} onChange={e=>setLocationForm(v=>({...v,parentId:e.target.value}))}><option value="">No parent — top level</option>{activeLocations.filter(x=>x.id!==editingLocationId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={locationForm.codexId} onChange={e=>setLocationForm(v=>({...v,codexId:e.target.value}))}><option value="">No Codex link</option>{worldRecords.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input type="number" min="0" max="100" value={locationForm.mapX} onChange={e=>setLocationForm(v=>({...v,mapX:e.target.value}))} placeholder="Map X %"/><input type="number" min="0" max="100" value={locationForm.mapY} onChange={e=>setLocationForm(v=>({...v,mapY:e.target.value}))} placeholder="Map Y %"/><input className="full-width" value={locationForm.tags} onChange={e=>setLocationForm(v=>({...v,tags:e.target.value}))} placeholder="Tags, comma separated"/><textarea className="full-width" rows={4} value={locationForm.description} onChange={e=>setLocationForm(v=>({...v,description:e.target.value}))} placeholder="Geography, atmosphere, inhabitants, travel notes..."/></div><div className="form-management-actions"><button className="primary-action" disabled={explorerBusy||!locationForm.name.trim()} onClick={saveLocation}>{editingLocationId?'Save Location Changes':'Add Location'}</button>{editingLocationId&&<button className="secondary-action" onClick={cancelLocationEdit}>Cancel Edit</button>}</div></section><div className="location-grid">{visibleLocations.map(loc=><article className="location-card" key={loc.id}><div className="location-card-top"><span className="world-type">{loc.location_type}</span><button className="favorite-star" onClick={()=>void toggleFavorite('location',loc.id)}>{favoriteKeys.has(`location:${loc.id}`)?'★':'☆'}</button></div><h3>{loc.name}</h3>{loc.parent_location_id&&<small>Inside {(loc.parent_location_id ? locationById.get(loc.parent_location_id)?.name : null)||'another location'}</small>}<p>{loc.description||'Ready for location lore.'}</p><div className="tag-row">{(loc.tags||[]).map(t=><span key={t}>{t}</span>)}</div><div className="world-actions">{loc.codex_record_id&&codexById.get(loc.codex_record_id)&&<button className="secondary-action" onClick={()=>void openWorldOrganization(codexById.get(loc.codex_record_id as string)!)}>Codex</button>}<button className="secondary-action" onClick={()=>{setSelectedLocationId(loc.id);setExplorerTab('map')}}>Show on Map</button><button className="secondary-action" onClick={()=>editLocation(loc)}>Edit</button><button className="secondary-action archive-action" onClick={()=>void archiveExplorerItem('studio_world_locations',loc.id)}>Archive</button></div></article>)}</div></>}
{explorerTab==='timeline'&&<><section className={`explorer-form ${editingEventId?'editing-form':''}`}><span className="creator-kicker">{editingEventId?'EDIT HISTORY':'CHRONICLE HISTORY'}</span><h2>{editingEventId?'Update Timeline Event':'Add Timeline Event'}</h2>{editingEventId&&<p className="edit-notice">Changes update this event without creating a duplicate.</p>}<div className="explorer-form-grid"><input value={eventForm.title} onChange={e=>setEventForm(v=>({...v,title:e.target.value}))} placeholder="Event title"/><input value={eventForm.era} onChange={e=>setEventForm(v=>({...v,era:e.target.value}))} placeholder="Era / age"/><input value={eventForm.displayDate} onChange={e=>setEventForm(v=>({...v,displayDate:e.target.value}))} placeholder="Date label — e.g. 742 AD"/><input type="number" value={eventForm.sortOrder} onChange={e=>setEventForm(v=>({...v,sortOrder:e.target.value}))} placeholder="Chronology order"/><select value={eventForm.locationId} onChange={e=>setEventForm(v=>({...v,locationId:e.target.value}))}><option value="">No linked location</option>{activeLocations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={eventForm.codexId} onChange={e=>setEventForm(v=>({...v,codexId:e.target.value}))}><option value="">No linked Codex entry</option>{worldRecords.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={eventForm.characterId} onChange={e=>setEventForm(v=>({...v,characterId:e.target.value}))}><option value="">No linked character</option>{studioCharacters.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input value={eventForm.tags} onChange={e=>setEventForm(v=>({...v,tags:e.target.value}))} placeholder="Tags, comma separated"/><textarea className="full-width" rows={4} value={eventForm.description} onChange={e=>setEventForm(v=>({...v,description:e.target.value}))} placeholder="What happened, why it mattered, and what changed?"/></div><div className="form-management-actions"><button className="primary-action" disabled={explorerBusy||!eventForm.title.trim()} onClick={saveTimelineEvent}>{editingEventId?'Save Event Changes':'Add Event'}</button>{editingEventId&&<button className="secondary-action" onClick={cancelEventEdit}>Cancel Edit</button>}</div></section><div className="timeline-list">{visibleEvents.map(ev=><article className="timeline-event" key={ev.id}><div className="timeline-rail"><span/></div><div className="timeline-copy"><div className="timeline-meta"><span>{ev.era||'Unknown Era'}</span><b>{ev.display_date||`Order ${ev.sort_order}`}</b><button className="favorite-star" onClick={()=>void toggleFavorite('event',ev.id)}>{favoriteKeys.has(`event:${ev.id}`)?'★':'☆'}</button></div><h3>{ev.title}</h3><p>{ev.description||'No event details yet.'}</p><div className="tag-row">{ev.location_id&&<span>{locationById.get(ev.location_id)?.name}</span>}{ev.codex_record_id&&<span>{codexById.get(ev.codex_record_id)?.name}</span>}{ev.character_id&&<span>{charById.get(ev.character_id)?.name}</span>}{(ev.tags||[]).map(t=><span key={t}>{t}</span>)}</div><div className="world-actions"><button className="secondary-action" onClick={()=>editTimelineEvent(ev)}>Edit Event</button><button className="secondary-action archive-action" onClick={()=>void archiveExplorerItem('studio_timeline_events',ev.id)}>Archive</button></div></div></article>)}</div></>}
{explorerTab==='favorites'&&<div className="favorites-grid">{activeLocations.filter(x=>favoriteKeys.has(`location:${x.id}`)).map(loc=><button key={loc.id} className="favorite-card" onClick={()=>{setSelectedLocationId(loc.id);setExplorerTab('map')}}><span className="world-type">LOCATION</span><h3>{loc.name}</h3><p>{loc.description||loc.location_type}</p></button>)}{activeEvents.filter(x=>favoriteKeys.has(`event:${x.id}`)).map(ev=><button key={ev.id} className="favorite-card" onClick={()=>setExplorerTab('timeline')}><span className="world-type">TIMELINE</span><h3>{ev.title}</h3><p>{ev.display_date||ev.era||'Historical event'}</p></button>)}{!activeLocations.some(x=>favoriteKeys.has(`location:${x.id}`))&&!activeEvents.some(x=>favoriteKeys.has(`event:${x.id}`))&&<div className="studio-footer-card"><strong>No active favorites yet.</strong><p>Use ☆ on locations and timeline events to keep important lore close.</p></div>}</div>}
{explorerTab==='archive'&&<section className="archive-section"><div className="archive-heading"><div><span className="creator-kicker">RECOVERY VAULT</span><h2>Archived World Lore</h2><p>Restore anything you still need. Permanent deletion is only available here.</p></div></div><div className="archive-grid">{archivedLocations.map(loc=><article className="archive-card" key={loc.id}><span className="world-type">LOCATION • {loc.location_type}</span><h3>{loc.name}</h3><p>{loc.description||'Archived location'}</p><div className="world-actions"><button className="primary-action" onClick={()=>void restoreExplorerItem('studio_world_locations',loc.id)}>Restore</button><button className="secondary-action danger-action" onClick={()=>void permanentlyDeleteExplorerItem('studio_world_locations',loc.id,loc.name)}>Delete Forever</button></div></article>)}{archivedEvents.map(ev=><article className="archive-card" key={ev.id}><span className="world-type">TIMELINE EVENT</span><h3>{ev.title}</h3><p>{ev.display_date||ev.era||'Archived historical event'}</p><div className="world-actions"><button className="primary-action" onClick={()=>void restoreExplorerItem('studio_timeline_events',ev.id)}>Restore</button><button className="secondary-action danger-action" onClick={()=>void permanentlyDeleteExplorerItem('studio_timeline_events',ev.id,ev.title)}>Delete Forever</button></div></article>)}{!archivedLocations.length&&!archivedEvents.length&&<div className="studio-footer-card"><strong>Archive is empty.</strong><p>Archived locations and events will appear here instead of being destroyed immediately.</p></div>}</div></section>}
</section></main>;
}

if (page === "world") {
const labels: Record<string,string> = { realm:"Realm / Homeland", race:"Race / Species", faction:"Faction / Clan / House", family:"Family / Bloodline" };
const filteredWorld = worldRecords.filter((record) => {
  const q = worldSearch.trim().toLowerCase();
  return (worldTypeFilter === "all" || record.record_type === worldTypeFilter)
    && (!q || [record.name, record.subtype, record.description].filter(Boolean).join(" ").toLowerCase().includes(q));
});
const linkedCharacters = selectedWorldRecord ? studioCharacters.filter((saved) => {
  if (selectedWorldRecord.record_type === "realm") return saved.realm_record_id === selectedWorldRecord.id;
  if (selectedWorldRecord.record_type === "race") return saved.race_record_id === selectedWorldRecord.id;
  if (selectedWorldRecord.record_type === "faction") return saved.faction_record_id === selectedWorldRecord.id;
  return saved.family_record_id === selectedWorldRecord.id;
}) : [];
const loreLabels: Record<keyof typeof worldEditLore,string> = { history:"History & Origins", culture:"Culture & Society", geography:"Geography / Domain", magic:"Magic & Powers", government:"Government / Hierarchy", notes:"Additional Lore" };
return (
  <main className="dashboard-shell codex-page">
    <style>{`
      .world-layout{width:min(1240px,calc(100% - 48px));margin:0 auto;padding:52px 0 100px}.world-toolbar{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin:28px 0}.world-toolbar input,.world-toolbar select,.world-form input,.world-form select,.world-form textarea,.codex-editor input,.codex-editor textarea,.codex-editor select{width:100%;box-sizing:border-box;padding:13px 14px;border-radius:12px;border:1px solid rgba(185,92,209,.24);background:#110914;color:#e8dfea}.world-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}.world-card{padding:0;overflow:hidden;text-align:left;border:1px solid rgba(185,92,209,.22);border-radius:20px;background:linear-gradient(180deg,rgba(30,13,33,.96),rgba(10,6,14,.98));color:#ddd}.world-card-cover{height:130px;background:radial-gradient(circle,rgba(105,35,119,.3),#09060c);position:relative;overflow:hidden}.world-card-cover img{width:100%;height:100%;object-fit:cover}.world-card-emblem{position:absolute;left:16px;bottom:12px;width:54px;height:54px;border-radius:14px;object-fit:cover;border:1px solid rgba(232,201,111,.45);background:#0d0811}.world-card-body{padding:20px}.world-card h3{font-family:Georgia,serif;color:#f0d481;font-size:25px;margin:8px 0}.world-card p{color:#a991ad;line-height:1.6;min-height:50px}.world-type{color:#b96ac6;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.world-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.world-form{margin:34px 0;padding:24px;border:1px solid rgba(232,201,111,.2);border-radius:22px;background:rgba(18,8,21,.7)}.world-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.world-form textarea{grid-column:1/-1}.codex-hero{position:relative;min-height:360px;border-radius:28px;overflow:hidden;border:1px solid rgba(232,201,111,.25);margin-bottom:26px;background:radial-gradient(circle at 70% 20%,rgba(102,37,112,.4),#0a0710 70%)}.codex-hero-bg{position:absolute;inset:0}.codex-hero-bg img{width:100%;height:100%;object-fit:cover;opacity:.45}.codex-hero-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,5,10,.96),rgba(7,5,10,.5)),linear-gradient(0deg,rgba(7,5,10,.9),transparent 70%)}.codex-hero-content{position:relative;z-index:2;min-height:300px;padding:34px;display:flex;align-items:flex-end;gap:24px}.codex-emblem{width:120px;height:120px;border-radius:22px;border:1px solid rgba(232,201,111,.45);background:#0d0811;display:grid;place-items:center;overflow:hidden;color:#e5bd57;font-size:44px;flex:0 0 auto}.codex-emblem img{width:100%;height:100%;object-fit:cover}.codex-title h2{font-family:Georgia,serif;color:#f0d481;font-size:clamp(38px,6vw,64px);margin:5px 0}.codex-title p{max-width:760px;color:#c0afc2;line-height:1.7}.codex-editor{padding:26px;border:1px solid rgba(185,92,209,.18);border-radius:22px;background:rgba(16,9,20,.8);margin-bottom:26px}.codex-editor-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.codex-editor-grid textarea{grid-column:1/-1}.codex-media-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}.codex-upload{padding:16px;border:1px dashed rgba(185,92,209,.3);border-radius:16px}.codex-upload strong{display:block;color:#e8c96f;margin-bottom:8px}.codex-section{padding:28px 0;border-top:1px solid rgba(185,92,209,.14)}.codex-section h3{font-family:Georgia,serif;color:#edd080;font-size:28px;margin:0 0 16px}.codex-lore-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.codex-lore-card{padding:20px;border:1px solid rgba(185,92,209,.16);border-radius:17px;background:rgba(20,9,23,.55)}.codex-lore-card strong{display:block;color:#b96ac6;font-size:11px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:9px}.codex-lore-card p{white-space:pre-wrap;color:#c5b5c7;line-height:1.75;margin:0}.world-character-strip,.related-codex-grid{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}.world-character-chip,.related-codex-card{display:flex;align-items:center;gap:10px;padding:10px 13px;border:1px solid rgba(185,92,209,.22);border-radius:14px;background:#0d0811;color:#ddd;cursor:pointer}.world-character-chip img,.related-codex-card img{width:46px;height:46px;border-radius:10px;object-fit:cover}.related-codex-card div{text-align:left}.related-codex-card small{display:block;color:#a978b0;text-transform:uppercase;font-size:9px;letter-spacing:.1em}.relation-builder{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;margin-top:18px}.related-remove{margin-left:6px;color:#d79aa7}.codex-profile-links{display:flex;flex-wrap:wrap;gap:9px;margin:14px 0 4px}.codex-profile-link{padding:7px 11px;border-radius:999px;border:1px solid rgba(232,201,111,.28);background:rgba(22,10,25,.72);color:#e7cc78;cursor:pointer}@media(max-width:700px){.world-layout{width:min(100% - 28px,1240px)}.world-toolbar,.world-form-grid,.codex-editor-grid,.codex-media-row,.codex-lore-grid,.relation-builder{grid-template-columns:1fr}.codex-hero-content{flex-direction:column;align-items:flex-start}.codex-emblem{width:90px;height:90px}}
    `}</style>
    <header className="studio-header"><div className="brand"><div className="brand-moon">☾</div><div><p className="header-eyebrow">UMBRA CONNECT</p><h2>Umbra Studio</h2></div></div><div className="account-area"><button type="button" className="sign-out-button" onClick={returnToDashboard}>← Back to Studio</button></div></header>
    <section className="world-layout">
      <div className="welcome-section"><p className="eyebrow">THE UMBRAL CODEX</p><h1>World Encyclopedia</h1><p>Build the realms, peoples, factions, and bloodlines that shape your universe.</p></div>
      {worldError && <p className="login-error">{worldError}</p>}
      {selectedWorldRecord && <>
        <div className="codex-hero"><div className="codex-hero-bg">{worldEditCoverUrl && <img src={worldEditCoverUrl} alt="" />}</div><div className="codex-hero-content"><div className="codex-emblem">{worldEditEmblemUrl ? <img src={worldEditEmblemUrl} alt={`${worldEditName} emblem`} /> : "⌘"}</div><div className="codex-title"><span className="world-type">{labels[selectedWorldRecord.record_type]} • {selectedWorldRecord.is_public ? "PUBLISHED" : "PRIVATE"}</span><h2>{worldEditName || selectedWorldRecord.name}</h2>{worldEditSubtype && <strong>{worldEditSubtype}</strong>}<p>{worldEditDescription || "This Codex entry is waiting for its lore."}</p><div className="world-actions"><button type="button" className="secondary-action" onClick={() => { populateWorldEditor(null); setWorldRelated([]); }}>← All Codex Entries</button><button type="button" className="secondary-action" onClick={() => toggleWorldPublication(selectedWorldRecord)}>{selectedWorldRecord.is_public ? "Make Private" : "Publish Codex Entry"}</button></div></div></div></div>
        <div className="codex-editor"><span className="creator-kicker">EDIT CODEX PAGE</span><h3>Identity & Lore</h3><div className="codex-editor-grid"><input value={worldEditName} onChange={(e)=>setWorldEditName(e.target.value)} placeholder="Codex name"/><input value={worldEditSubtype} onChange={(e)=>setWorldEditSubtype(e.target.value)} placeholder="Subtype / title"/><textarea rows={4} value={worldEditDescription} onChange={(e)=>setWorldEditDescription(e.target.value)} placeholder="Overview / summary..."/>{(Object.keys(loreLabels) as (keyof typeof worldEditLore)[]).map((key)=><textarea key={key} rows={4} value={worldEditLore[key]} onChange={(e)=>setWorldEditLore((current)=>({...current,[key]:e.target.value}))} placeholder={`${loreLabels[key]}...`}/>)}</div>
          <div className="codex-media-row"><div className="codex-upload"><strong>Cover / Banner Image</strong><input type="file" accept="image/*" disabled={uploadingWorldMedia!==null} onChange={(e)=>{const f=e.target.files?.[0];if(f) void uploadWorldImage(f,"cover");e.currentTarget.value="";}}/><small>{uploadingWorldMedia==="cover"?"Uploading...":"Landscape artwork works best."}</small></div><div className="codex-upload"><strong>Emblem / Symbol</strong><input type="file" accept="image/*" disabled={uploadingWorldMedia!==null} onChange={(e)=>{const f=e.target.files?.[0];if(f) void uploadWorldImage(f,"emblem");e.currentTarget.value="";}}/><small>{uploadingWorldMedia==="emblem"?"Uploading...":"Square crests, sigils, or icons work best."}</small></div></div>
          <button type="button" className="primary-action" disabled={worldDetailBusy} onClick={saveWorldDetails}>{worldDetailBusy?"Saving...":"Save Codex Page"}</button>
        </div>
        <section className="codex-section"><h3>Lore Archive</h3><div className="codex-lore-grid">{(Object.keys(loreLabels) as (keyof typeof worldEditLore)[]).filter((key)=>worldEditLore[key].trim()).map((key)=><div className="codex-lore-card" key={key}><strong>{loreLabels[key]}</strong><p>{worldEditLore[key]}</p></div>)}</div></section>
        <section className="codex-section"><h3>Characters of {worldEditName || selectedWorldRecord.name}</h3><div className="world-character-strip">{linkedCharacters.length ? linkedCharacters.map((saved)=>{const portrait=saved.portrait_url||saved.media?.portraitUrl||"";return <button type="button" className="world-character-chip" key={saved.id} onClick={()=>openCharacterProfile(saved,"characters")}>{portrait&&<img src={portrait} alt=""/>}<span>{saved.name}</span></button>}) : <p>No Studio characters are linked to this entry yet.</p>}</div></section>
        <section className="codex-section"><h3>Related Codex Entries</h3><div className="related-codex-grid">{worldRelated.map((link)=>{const target=link.target;if(!target)return null;return <div className="related-codex-card" key={link.id}><button type="button" style={{all:"unset",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>void openWorldOrganization(target)}>{target.emblem_url&&<img src={target.emblem_url} alt=""/>}<div><strong>{target.name}</strong><small>{link.relation_label||labels[target.record_type]}</small></div></button><button type="button" className="related-remove" onClick={()=>void removeWorldRelation(link)}>×</button></div>})}</div><div className="relation-builder"><select value={worldRelatedTargetId} onChange={(e)=>setWorldRelatedTargetId(e.target.value)}><option value="">Choose another Codex entry...</option>{worldRecords.filter((item)=>item.id!==selectedWorldRecord.id).map((item)=><option key={item.id} value={item.id}>{item.name} — {labels[item.record_type]}</option>)}</select><input value={worldRelatedLabel} onChange={(e)=>setWorldRelatedLabel(e.target.value)} placeholder="Relationship label: homeland of, allied with..."/><button type="button" className="secondary-action" disabled={!worldRelatedTargetId||worldDetailBusy} onClick={addWorldRelation}>Connect</button></div></section>
      </>}
      {!selectedWorldRecord && <>
        <div className="world-form"><span className="creator-kicker">NEW CODEX ENTRY</span><h3>Create World Record</h3><div className="world-form-grid"><select value={worldFormType} onChange={(e)=>setWorldFormType(e.target.value as typeof worldFormType)}><option value="realm">Realm / Homeland</option><option value="race">Race / Species</option><option value="faction">Faction / Clan / House</option><option value="family">Family / Bloodline</option></select><input value={worldFormName} onChange={(e)=>setWorldFormName(e.target.value)} placeholder="Name..."/><input value={worldFormSubtype} onChange={(e)=>setWorldFormSubtype(e.target.value)} placeholder="Subtype / title (optional)..."/><textarea rows={4} value={worldFormDescription} onChange={(e)=>setWorldFormDescription(e.target.value)} placeholder="Describe this part of the Umbral World..."/></div><button type="button" className="primary-action" disabled={worldSaving||!worldFormName.trim()} onClick={createWorldRecord}>{worldSaving?"Creating...":"Create Codex Entry"}</button></div>
        <div className="world-toolbar"><input type="search" value={worldSearch} onChange={(e)=>setWorldSearch(e.target.value)} placeholder="Search the Codex..."/><select value={worldTypeFilter} onChange={(e)=>setWorldTypeFilter(e.target.value as typeof worldTypeFilter)}><option value="all">All types</option><option value="realm">Realms / Homelands</option><option value="race">Races / Species</option><option value="faction">Factions / Clans / Houses</option><option value="family">Families / Bloodlines</option></select></div>
        {loadingWorld?<div className="studio-footer-card"><strong>Opening the Codex...</strong></div>:<div className="world-grid">{filteredWorld.map((record)=><article className="world-card" key={record.id}><div className="world-card-cover">{record.cover_url&&<img src={record.cover_url} alt=""/>}{record.emblem_url&&<img className="world-card-emblem" src={record.emblem_url} alt=""/>}</div><div className="world-card-body"><span className="world-type">{labels[record.record_type]}</span><h3>{record.name}</h3>{record.subtype&&<strong>{record.subtype}</strong>}<p>{record.description||"Ready for worldbuilding details."}</p><div className="world-actions"><button type="button" className="primary-action" onClick={()=>void openWorldOrganization(record)}>Open Codex Page</button><button type="button" className="secondary-action" onClick={()=>toggleWorldPublication(record)}>{record.is_public?"Published":"Private"}</button><button type="button" className="secondary-action danger-action" onClick={()=>deleteWorldRecord(record)}>Delete</button></div></div></article>)}</div>}
      </>}
    </section>
  </main>
);
}

if (page === "connections" && connectionCenter) {
const familyTypes = new Set(["parent", "child", "sibling", "partner"]);
const visibleLinks = connectionView === "family"
  ? connectionLinks.filter((link) => familyTypes.has(link.relationship_type))
  : connectionLinks;
const grouped = {
  parents: visibleLinks.filter((link) => link.relationship_type === "parent"),
  partner: visibleLinks.filter((link) => link.relationship_type === "partner"),
  siblings: visibleLinks.filter((link) => link.relationship_type === "sibling"),
  children: visibleLinks.filter((link) => link.relationship_type === "child"),
  others: visibleLinks.filter((link) => !familyTypes.has(link.relationship_type)),
};
const centerPortrait = connectionCenter.portrait_url || connectionCenter.media?.portraitUrl || "";
const relationLabel: Record<string,string> = {
  parent:"Parent", child:"Child", sibling:"Sibling", partner:"Partner",
  ally:"Ally", rival:"Rival", enemy:"Enemy", mentor:"Mentor", student:"Student"
};
const ConnectionNode = ({ link }: { link: CharacterRelationship }) => {
  const target = link.target;
  if (!target) return null;
  const image = target.portrait_url || target.media?.portraitUrl || "";
  return (
    <button type="button" className={`connection-node relation-${link.relationship_type}`} onClick={() => void moveConnectionCenter(target)}>
      <div className="connection-node-image">{image ? <img src={image} alt={`${target.name} portrait`} /> : <span>☾</span>}</div>
      <strong>{target.name || "Unnamed Character"}</strong>
      <small>{relationLabel[link.relationship_type] || link.relationship_type}</small>
    </button>
  );
};
return (
  <main className="dashboard-shell connections-page">
    <style>{`
      .connections-page{min-height:100vh;background:radial-gradient(circle at 50% 8%,rgba(91,31,101,.2),transparent 32%),#07050a;color:#eee}
      .connections-content{width:min(1220px,calc(100% - 48px));margin:0 auto;padding:58px 0 100px}
      .connections-heading{text-align:center;max-width:760px;margin:0 auto 28px}.connections-heading h1{font-family:Georgia,serif;color:#f0d481;font-size:clamp(42px,6vw,68px);margin:8px 0 12px}.connections-heading p{color:#aa94ae;line-height:1.7}
      .connection-tabs{display:flex;justify-content:center;gap:10px;margin:26px 0 42px;flex-wrap:wrap}.connection-tab{padding:11px 18px;border-radius:999px;border:1px solid rgba(185,92,209,.24);background:#120914;color:#bbaabd;cursor:pointer}.connection-tab.active{border-color:rgba(232,201,111,.55);color:#f0d481;background:rgba(92,52,23,.18)}
      .family-tree{display:grid;gap:28px}.tree-level{position:relative;text-align:center}.tree-level-title{display:block;margin-bottom:13px;color:#9e77a5;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.tree-row{display:flex;justify-content:center;align-items:flex-start;gap:18px;flex-wrap:wrap}.tree-connector{width:1px;height:28px;background:linear-gradient(#b55dc4,#e5bd57);margin:0 auto;opacity:.65}
      .connection-center{width:min(440px,100%);margin:0 auto;padding:22px;border-radius:24px;border:1px solid rgba(232,201,111,.38);background:linear-gradient(180deg,rgba(54,24,58,.9),rgba(14,8,18,.96));box-shadow:0 24px 70px rgba(0,0,0,.34);display:flex;align-items:center;gap:18px;text-align:left}.connection-center-image{width:110px;height:130px;flex:0 0 auto;border-radius:16px;overflow:hidden;background:#100914;display:grid;place-items:center;color:#e5bd57;font-size:42px}.connection-center-image img{width:100%;height:100%;object-fit:cover}.connection-center h2{margin:4px 0;font-family:Georgia,serif;color:#f0d481;font-size:30px}.connection-center p{margin:0;color:#a994ad}.connection-center .creator-kicker{font-size:10px}
      .connection-node{width:180px;padding:0 0 14px;overflow:hidden;border-radius:18px;border:1px solid rgba(185,92,209,.24);background:#120914;color:#ddd;cursor:pointer;transition:.18s transform,.18s border-color;text-align:center}.connection-node:hover{transform:translateY(-4px);border-color:rgba(232,201,111,.55)}.connection-node-image{height:190px;background:radial-gradient(circle,rgba(105,35,119,.3),#09060c);display:grid;place-items:center;color:#e5bd57;font-size:48px}.connection-node-image img{width:100%;height:100%;object-fit:cover}.connection-node strong{display:block;padding:12px 10px 2px;color:#ead7ec}.connection-node small{display:block;color:#b66ec3;text-transform:uppercase;font-size:10px;letter-spacing:.12em}.relation-parent,.relation-child{border-color:rgba(232,201,111,.28)}.relation-partner{border-color:rgba(197,91,143,.32)}
      .all-connections-map{position:relative;min-height:620px;border:1px solid rgba(185,92,209,.14);border-radius:28px;background:radial-gradient(circle at center,rgba(75,26,84,.24),transparent 34%),rgba(10,6,14,.72);padding:44px 24px;overflow:hidden}.all-map-center{position:relative;z-index:2;margin:190px auto 0}.connection-orbit{position:absolute;inset:24px;display:flex;flex-wrap:wrap;justify-content:center;align-content:flex-start;gap:20px;z-index:1}.connection-orbit .connection-node{width:160px}.connection-orbit .connection-node-image{height:155px}
      .connections-empty{text-align:center;padding:58px 24px;border:1px solid rgba(185,92,209,.16);border-radius:22px;background:rgba(18,8,21,.55)}.connections-empty strong{display:block;color:#e8c96f;font-family:Georgia,serif;font-size:25px;margin-bottom:10px}.connections-empty p{color:#a994ad}
      .connections-hint{text-align:center;color:#8e7b91;font-size:12px;margin-top:22px}
      @media(max-width:700px){.connections-content{width:min(100% - 28px,1220px)}.connection-center{flex-direction:column;text-align:center}.all-connections-map{min-height:auto}.all-map-center{margin:30px auto}.connection-orbit{position:relative;inset:auto}.connection-node{width:150px}.connection-node-image{height:155px}}
    `}</style>
    <header className="studio-header">
      <div className="brand"><div className="brand-moon">☾</div><div><p className="header-eyebrow">UMBRA CONNECT</p><h2>Umbra Studio</h2></div></div>
      <div className="account-area"><button type="button" className="sign-out-button" onClick={returnFromConnections}>← Back to Profile</button></div>
    </header>
    <section className="connections-content">
      <div className="connections-heading">
        <p className="eyebrow">BONDS OF THE UMBRAL WORLD</p>
        <h1>{connectionView === "family" ? "Family Tree" : "Relationship Map"}</h1>
        <p>Explore the people connected to <strong>{connectionCenter.name}</strong>. Select any portrait to recenter the map on that character.</p>
      </div>
      <div className="connection-tabs">
        <button type="button" className={`connection-tab ${connectionView === "family" ? "active" : ""}`} onClick={() => setConnectionView("family")}>Family Tree</button>
        <button type="button" className={`connection-tab ${connectionView === "all" ? "active" : ""}`} onClick={() => setConnectionView("all")}>All Connections</button>
      </div>
      {relationshipError && <p className="login-error" role="alert">{relationshipError}</p>}
      {loadingConnections ? <div className="connections-empty"><strong>Tracing connections...</strong><p>Following the bonds surrounding this character.</p></div> : connectionView === "family" ? (
        visibleLinks.length === 0 ? <div className="connections-empty"><strong>No family connections yet</strong><p>Add parents, children, siblings, or a partner from the Relationships step.</p></div> :
        <div className="family-tree">
          {grouped.parents.length > 0 && <div className="tree-level"><span className="tree-level-title">Parents</span><div className="tree-row">{grouped.parents.map((link) => <ConnectionNode key={link.id} link={link} />)}</div><div className="tree-connector" /></div>}
          <div className="tree-level">
            <span className="tree-level-title">Current Character</span>
            <div className="tree-row">
              {grouped.partner.map((link) => <ConnectionNode key={link.id} link={link} />)}
              <div className="connection-center"><div className="connection-center-image">{centerPortrait ? <img src={centerPortrait} alt={`${connectionCenter.name} portrait`} /> : "☾"}</div><div><span className="creator-kicker">CENTER OF TREE</span><h2>{connectionCenter.name}</h2><p>{connectionCenter.identity?.alias || connectionCenter.identity?.race || "Umbral Character"}</p></div></div>
            </div>
          </div>
          {grouped.siblings.length > 0 && <div className="tree-level"><div className="tree-connector" /><span className="tree-level-title">Siblings</span><div className="tree-row">{grouped.siblings.map((link) => <ConnectionNode key={link.id} link={link} />)}</div></div>}
          {grouped.children.length > 0 && <div className="tree-level"><div className="tree-connector" /><span className="tree-level-title">Children</span><div className="tree-row">{grouped.children.map((link) => <ConnectionNode key={link.id} link={link} />)}</div></div>}
        </div>
      ) : (
        visibleLinks.length === 0 ? <div className="connections-empty"><strong>No connections yet</strong><p>Add connected characters from the Relationships step to build this map.</p></div> :
        <div className="all-connections-map">
          <div className="connection-orbit">{visibleLinks.map((link) => <ConnectionNode key={link.id} link={link} />)}</div>
          <div className="connection-center all-map-center"><div className="connection-center-image">{centerPortrait ? <img src={centerPortrait} alt={`${connectionCenter.name} portrait`} /> : "☾"}</div><div><span className="creator-kicker">CENTER OF MAP</span><h2>{connectionCenter.name}</h2><p>{connectionCenter.identity?.alias || connectionCenter.identity?.race || "Umbral Character"}</p></div></div>
        </div>
      )}
      <p className="connections-hint">Click a connected character to make them the center and continue exploring their relationships.</p>
    </section>
  </main>
);
}

if (page === "profile" && selectedCharacter) {
const saved = selectedCharacter;
const identity = saved.identity ?? {};
const appearance = saved.appearance ?? {};
const origin = saved.origin_lore ?? {};
const abilities = saved.abilities ?? {};
const relationships = saved.relationships ?? {};
const media = saved.media ?? {};
const portrait = saved.portrait_url || media.portraitUrl || "";
const mediaItems = [
  { label: "Portrait", url: media.portraitUrl || saved.portrait_url || "" },
  { label: "Reference Sheet", url: media.referenceArtUrl || "" },
  { label: "Alternate / True Form", url: media.alternateFormUrl || "" },
].filter((item) => item.url);
const galleryImages = Array.isArray(media.galleryUrls) ? media.galleryUrls : [];
const entries = (record: Record<string, string>, labels: Record<string, string>) =>
  Object.entries(labels)
    .map(([key, label]) => ({ label, value: record[key] }))
    .filter((item) => item.value && item.value.trim());
const productionItems = entries(media, { visualAssets:"Visual Production Asset Checklist", productionNotes:"Blender / VRoid Production Notes", canonLocks:"Canon Locks", tbdFields:"Editable / TBD Fields" });
const identityItems = entries(identity, { nicknames:"Nicknames", titles:"Titles", pronunciation:"Pronunciation", nameMeaning:"Name Meaning", birthDate:"Birth Date", elementalHeritage:"Elemental Heritage", canonStatus:"Canon Status", spoilerLevel:"Spoiler Level", era:"Era", age:"Age", apparentAge:"Apparent Age", gender:"Gender", pronouns:"Pronouns", race:"Race / Species", subrace:"Subrace / Variant", heritage:"Heritage / Ethnicity", nationality:"Nationality / People", homeland:"Homeland", currentResidence:"Current Residence", affiliation:"Affiliation", occupation:"Occupation / Role" });
const appearanceItems = entries(appearance, { skinTone:"Skin Tone / Complexion", skinHex:"Skin HEX / Color Reference", faceDetails:"Face Details", eyeColor:"Eye Color", eyeHex:"Eye HEX / Color Reference", hairColor:"Hair Color", hairHex:"Hair HEX / Color Reference", hairTexture:"Hair Texture", hairStyle:"Hair Style", height:"Height", weight:"Weight", dominantHand:"Dominant Hand", build:"Build", postureMovement:"Posture / Movement", distinguishingFeatures:"Distinguishing Features", makeup:"Makeup / Face Paint", grooming:"Grooming", nails:"Nails", colorPalette:"Official Color Palette", clothingStyle:"Fashion Style", signatureOutfit:"Signature / Default Outfit", outfitColors:"Outfit Color Breakdown", outfitMaterials:"Outfit Materials / Construction", wardrobe:"Wardrobe / Alternate Outfits", accessories:"Accessories", alternateForm:"Alternate / True Form", appearanceNotes:"Appearance Notes" });
const loreItems = entries(origin, { birthplace:"Birthplace / Origin", lineage:"Family / Lineage", culture:"Culture / Heritage", childhood:"Childhood / Early Life", majorLifeEvents:"Major Life Events", backstory:"Full Backstory", personality:"Personality", voiceSpeech:"Voice / Speech", psychology:"Psychology / Inner Character", lifestyle:"Lifestyle / Everyday Life", likesDislikes:"Likes / Dislikes / Preferences", motivations:"Motivations", goals:"Goals / Ambitions", fears:"Fears / Inner Conflicts", beliefs:"Beliefs / Worldview", storyRole:"Current Story Role", storyArc:"Character Arc / Story Information" });
const abilityItems = entries(abilities, { powerSource:"Power Source / Magic Type", combatStyle:"Combat Style", combatProfile:"Combat Profile", primaryAbilities:"Primary Abilities", secondaryAbilities:"Secondary Abilities", signatureTechniques:"Signature Techniques", weapons:"Weapons / Equipment", weaponDetails:"Weapon / Equipment Details", transformations:"Transformations / Power States", transformationDetails:"Transformation Details", strengths:"Strengths", weaknesses:"Weaknesses", limitations:"Limits / Costs / Conditions", abilityNotes:"Ability Notes" });
const relationshipItems = entries(relationships, { parents:"Parents / Guardians", siblings:"Siblings", children:"Children / Descendants", partner:"Partner / Love Interest", allies:"Friends / Allies", rivals:"Rivals", enemies:"Enemies", mentors:"Mentors / Students", relationshipNotes:"Relationship Notes", worldConnections:"World Connections" });
const profileCodexLinks = [
  { id:saved.realm_record_id, label:"Realm" }, { id:saved.race_record_id, label:"Race" },
  { id:saved.faction_record_id, label:"Faction" }, { id:saved.family_record_id, label:"Bloodline" },
].map((link)=>({ ...link, record:worldRecords.find((record)=>record.id===link.id) })).filter((link)=>link.record);
const ProfileSection = ({ title, symbol, items }: { title:string; symbol:string; items:{label:string;value:string}[] }) => items.length ? (
  <section className="profile-section">
    <div className="profile-section-title"><span>{symbol}</span><h2>{title}</h2></div>
    <div className="profile-detail-grid">
      {items.map((item) => <div className="profile-detail" key={`${title}-${item.label}`}><span>{item.label}</span><p>{item.value}</p></div>)}
    </div>
  </section>
) : null;

return (
  <main className="dashboard-shell profile-page">
    <style>{`
      .profile-page{min-height:100vh;background:radial-gradient(circle at 50% 0%,rgba(80,26,89,.16),transparent 34%),#07050a;color:#eee;}
      .profile-hero{position:relative;min-height:520px;display:flex;align-items:flex-end;overflow:hidden;border-bottom:1px solid rgba(185,92,209,.18);}
      .profile-hero-bg{position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,rgba(126,44,139,.32),transparent 34%),linear-gradient(110deg,#08050b 15%,#18091b 55%,#07050a);}
      .profile-hero-bg img{width:100%;height:100%;object-fit:cover;opacity:.28;filter:blur(3px);transform:scale(1.04);}
      .profile-hero-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,5,10,.96) 12%,rgba(7,5,10,.68) 52%,rgba(7,5,10,.9)),linear-gradient(0deg,#07050a 0%,transparent 55%);}
      .profile-hero-content{position:relative;z-index:2;width:min(1180px,calc(100% - 48px));margin:0 auto;padding:72px 0 54px;display:grid;grid-template-columns:280px 1fr;gap:44px;align-items:end;}
      .profile-portrait{height:360px;border-radius:26px;overflow:hidden;border:1px solid rgba(232,201,111,.3);background:radial-gradient(circle,rgba(105,35,119,.35),#0b0710 70%);box-shadow:0 30px 80px rgba(0,0,0,.45);display:grid;place-items:center;font-size:88px;color:#e5bd57;}
      .profile-portrait img{width:100%;height:100%;object-fit:cover;}
      .profile-copy .creator-kicker{display:block;margin-bottom:10px}.profile-copy h1{margin:0;font-family:Georgia,serif;font-size:clamp(46px,7vw,82px);line-height:.98;color:#f0d481;}
      .profile-alias{display:block;margin:14px 0;color:#d7bddb;font-size:20px}.profile-summary{max-width:760px;color:#bca9bf;font-size:17px;line-height:1.8;white-space:pre-wrap;}
      .profile-tags{display:flex;flex-wrap:wrap;gap:9px;margin:22px 0}.profile-tags span{padding:7px 11px;border-radius:999px;border:1px solid rgba(185,92,209,.25);background:rgba(22,10,25,.65);color:#d6bdd9;font-size:12px;}
      .profile-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.profile-content{width:min(1180px,calc(100% - 48px));margin:0 auto;padding:50px 0 90px;}
      .profile-section{padding:34px 0;border-bottom:1px solid rgba(185,92,209,.13)}.profile-section-title{display:flex;gap:12px;align-items:center;margin-bottom:22px}.profile-section-title span{color:#e5bd57;font-size:22px}.profile-section-title h2{margin:0;font-family:Georgia,serif;color:#edd080;font-size:30px;}
      .profile-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.profile-detail{padding:19px;border:1px solid rgba(185,92,209,.16);border-radius:16px;background:rgba(21,10,24,.52)}.profile-detail span{display:block;color:#b66ec3;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px}.profile-detail p{margin:0;color:#c8b9ca;line-height:1.75;white-space:pre-wrap;}
      .profile-media-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px}.profile-media-card{overflow:hidden;border-radius:18px;border:1px solid rgba(185,92,209,.18);background:#100914}.profile-media-card img{width:100%;height:300px;object-fit:cover;display:block}.profile-media-card span{display:block;padding:13px 15px;color:#d8c0db;font-weight:700}.profile-gallery-link{margin-top:18px;display:inline-block;color:#e8c96f;word-break:break-all}.profile-media-notes{margin-top:20px;color:#bbaabd;line-height:1.75;white-space:pre-wrap;}
      .library-profile-button{width:100%;margin-top:20px}.saved-character-actions{flex-wrap:wrap}.saved-character-actions .secondary-action{flex:1;min-width:120px}
      @media(max-width:760px){.profile-hero-content{grid-template-columns:1fr;padding-top:40px}.profile-portrait{height:420px;max-width:360px}.profile-detail-grid{grid-template-columns:1fr}.profile-content,.profile-hero-content{width:min(100% - 28px,1180px)}}
    `}</style>
    <header className="studio-header">
      <div className="brand"><div className="brand-moon">☾</div><div><p className="header-eyebrow">UMBRA CONNECT</p><h2>Umbra Studio</h2></div></div>
      <div className="account-area"><button type="button" className="sign-out-button" onClick={returnFromProfile}>← Back</button></div>
    </header>
    <section className="profile-hero">
      <div className="profile-hero-bg">{portrait && <img src={portrait} alt="" />}</div>
      <div className="profile-hero-content">
        <div className="profile-portrait">{portrait ? <img src={portrait} alt={`${saved.name} portrait`} /> : "☾"}</div>
        <div className="profile-copy">
          <span className="creator-kicker">{identity.race || appearance.alternateForm || "UMBRAL CHARACTER"}</span>
          <h1>{saved.name || "Unnamed Character"}</h1>
          {identity.alias && <strong className="profile-alias">{identity.alias}</strong>}
          <div className="profile-tags">{identity.race && <span>{identity.race}</span>}{identity.homeland && <span>{identity.homeland}</span>}{identity.affiliation && <span>{identity.affiliation}</span>}{saved.is_complete && <span>Complete Profile</span>}</div>
          {profileCodexLinks.length > 0 && <div className="codex-profile-links">{profileCodexLinks.map((link)=><button type="button" className="codex-profile-link" key={link.label} onClick={()=>void openWorldOrganization(link.record!)}>{link.label}: {link.record!.name}</button>)}</div>}
          <p className="profile-summary">{identity.summary || "A character of the Umbral World."}</p>
          <div className="profile-actions">
            {saved.is_complete && saved.user_id === session.user.id && <button type="button" className="primary-action" onClick={() => setCharacterPublication(saved, !saved.is_public)}>{saved.is_public ? "Unpublish Character" : "Publish to Library"}</button>}
            <button type="button" className="secondary-action" onClick={() => void openConnections(saved)}>View Connections</button>
            {saved.user_id === session.user.id && <button type="button" className="secondary-action" onClick={() => loadCharacterIntoEditor(saved)}>Edit Character</button>}
            <button type="button" className="secondary-action" onClick={returnFromProfile}>Back to {profileReturnPage === "library" ? "Library" : "My Characters"}</button>
          </div>
        </div>
      </div>
    </section>
    <div className="profile-content">
      <ProfileSection title="Identity" symbol="✦" items={identityItems} />
      <ProfileSection title="Appearance" symbol="◆" items={appearanceItems} />
      <ProfileSection title="Origin & Lore" symbol="☾" items={loreItems} />
      <ProfileSection title="Abilities & Combat" symbol="⚔" items={abilityItems} />
      {connectedRelationships.length > 0 && <section className="profile-section"><div className="profile-section-title"><span>♙</span><h2>Character Connections</h2></div><div className="profile-media-grid">{connectedRelationships.map((link) => { const target=link.target; if(!target) return null; const image=target.portrait_url || target.media?.portraitUrl || ""; return <button type="button" className="profile-media-card" style={{textAlign:"left",cursor:"pointer",color:"inherit"}} key={link.id} onClick={() => void openConnectedCharacterProfile(target)}>{image ? <img src={image} alt={`${target.name} portrait`} /> : <div style={{height:300,display:"grid",placeItems:"center",fontSize:64,color:"#e5bd57"}}>☾</div>}<span style={{textTransform:"capitalize"}}>{target.name} • {link.relationship_type}</span></button>})}</div></section>}
      <ProfileSection title="Written Relationships" symbol="♙" items={relationshipItems} />
      <ProfileSection title="Production & Canon Control" symbol="✧" items={productionItems} />
      {(mediaItems.length > 0 || galleryImages.length > 0 || media.galleryUrl || media.mediaNotes) && <section className="profile-section"><div className="profile-section-title"><span>▣</span><h2>Media & References</h2></div>{(mediaItems.length > 0 || galleryImages.length > 0) && <div className="profile-media-grid">{mediaItems.map((item) => <a className="profile-media-card" href={item.url} target="_blank" rel="noreferrer" key={item.label}><img src={item.url} alt={`${saved.name} ${item.label}`} /><span>{item.label}</span></a>)}{galleryImages.map((url: string, index: number) => <a className="profile-media-card" href={url} target="_blank" rel="noreferrer" key={url}><img src={url} alt={`${saved.name} gallery ${index + 1}`} /><span>Gallery Image {index + 1}</span></a>)}</div>}{media.galleryUrl && <a className="profile-gallery-link" href={media.galleryUrl} target="_blank" rel="noreferrer">Open additional gallery / media →</a>}{media.mediaNotes && <p className="profile-media-notes">{media.mediaNotes}</p>}</section>}
    </div>
  </main>
);
}

if (page === "create") {
const stepTitles = [
  "Character Identity",
  "Appearance",
  "Origin & Lore",
  "Abilities",
  "Relationships",
  "Media",
];

const stepDescriptions = [
  "Begin with the core details that define who this character is in the Umbral World.",
  "Shape the physical design, visual identity, and alternate forms of your character.",
  "Build the history, homeland, culture, motivations, and story that shaped this character.",
  "Define powers, techniques, weapons, transformations, strengths, and limitations.",
  "Connect this character to family, allies, rivals, clans, crews, houses, and other important bonds.",
  "Add portraits, reference artwork, transformation images, and other visual material.",
];

const navItems = [
  "Identity",
  "Appearance",
  "Origin & Lore",
  "Abilities",
  "Relationships",
  "Media",
];

const RepeatableList = ({ label, value, field, placeholder }: { label:string; value:string; field:keyof typeof character; placeholder:string }) => {
  const items = value.split(/\n+/).map((item)=>item.trim()).filter(Boolean);
  const [draft, setDraft] = useState("");
  const saveItems = (next:string[]) => updateCharacter(field, next.join("\n") as never);
  return <div className="creator-field full-width repeatable-field">
    <span>{label}</span>
    <div className="repeatable-add-row"><input value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder={placeholder} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();const next=draft.trim();if(next){saveItems([...items,next]);setDraft("");}}}}/><button type="button" className="secondary-action" onClick={()=>{const next=draft.trim();if(next){saveItems([...items,next]);setDraft("");}}}>+ Add</button></div>
    {items.length>0 ? <div className="repeatable-chip-list">{items.map((item,index)=><div className="repeatable-chip" key={`${label}-${index}-${item}`}><span>{item}</span><button type="button" aria-label={`Remove ${item}`} onClick={()=>saveItems(items.filter((_,i)=>i!==index))}>×</button></div>)}</div> : <small className="repeatable-empty">Nothing added yet.</small>}
  </div>;
};

const renderIdentityStep = () => (
  <section className="creator-form-card">
    <div className="form-section-heading">
      <span className="form-section-icon">✦</span>
      <div>
        <h3>Basic Information</h3>
        <p>Establish the character&apos;s primary identity.</p>
      </div>
    </div>

    <div className="creator-form-grid">
      <label className="creator-field full-width">
        <span>Character Name</span>
        <input
          type="text"
          placeholder="Enter character name..."
          value={character.name}
          onChange={(e) => updateCharacter("name", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Title / Alias</span>
        <input
          type="text"
          placeholder="The Living Mountain..."
          value={character.alias}
          onChange={(e) => updateCharacter("alias", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Age</span>
        <input
          type="text"
          placeholder="Age..."
          value={character.age}
          onChange={(e) => updateCharacter("age", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Race / Species</span>
        <select value={linkedRaceId} onChange={(e) => linkWorldRecord("race", e.target.value)}>
          <option value="">Custom / not linked</option>
          {worldRecords.filter((item) => item.record_type === "race").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input type="text" placeholder="Dragon, Sylvani Elf..." value={character.race} onChange={(e) => { setLinkedRaceId(""); updateCharacter("race", e.target.value); }} />
      </label>

      <label className="creator-field">
        <span>Gender</span>
        <input
          type="text"
          placeholder="Gender..."
          value={character.gender}
          onChange={(e) => updateCharacter("gender", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Homeland / Realm</span>
        <select value={linkedRealmId} onChange={(e) => linkWorldRecord("realm", e.target.value)}>
          <option value="">Custom / not linked</option>
          {worldRecords.filter((item) => item.record_type === "realm").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input type="text" placeholder="Realm, kingdom, territory..." value={character.homeland} onChange={(e) => { setLinkedRealmId(""); updateCharacter("homeland", e.target.value); }} />
      </label>

      <label className="creator-field">
        <span>Faction / Clan / House</span>
        <select value={linkedFactionId} onChange={(e) => linkWorldRecord("faction", e.target.value)}>
          <option value="">Custom / not linked</option>
          {worldRecords.filter((item) => item.record_type === "faction").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input type="text" placeholder="Clan, house, crew..." value={character.affiliation} onChange={(e) => { setLinkedFactionId(""); updateCharacter("affiliation", e.target.value); }} />
      </label>

      <label className="creator-field"><span>Nicknames</span><input type="text" placeholder="Informal names..." value={character.nicknames} onChange={(e)=>updateCharacter("nicknames",e.target.value)}/></label>
      <label className="creator-field"><span>Titles</span><input type="text" placeholder="Royal, magical, military, earned titles..." value={character.titles} onChange={(e)=>updateCharacter("titles",e.target.value)}/></label>
      <label className="creator-field"><span>Name Pronunciation</span><input type="text" placeholder="How the name is pronounced..." value={character.pronunciation} onChange={(e)=>updateCharacter("pronunciation",e.target.value)}/></label>
      <label className="creator-field"><span>Name Meaning</span><input type="text" placeholder="Meaning or origin of the name..." value={character.nameMeaning} onChange={(e)=>updateCharacter("nameMeaning",e.target.value)}/></label>
      <label className="creator-field"><span>Birth Date</span><input type="text" placeholder="Date, calendar date, or TBD..." value={character.birthDate} onChange={(e)=>updateCharacter("birthDate",e.target.value)}/></label>
      <label className="creator-field"><span>Elemental Heritage</span><input type="text" placeholder="Fire + Water, Earth + Air..." value={character.elementalHeritage} onChange={(e)=>updateCharacter("elementalHeritage",e.target.value)}/></label>
      <label className="creator-field"><span>Canon Status</span><input type="text" placeholder="Canon, concept, alternate, draft..." value={character.canonStatus} onChange={(e)=>updateCharacter("canonStatus",e.target.value)}/></label>
      <label className="creator-field"><span>Spoiler Level</span><input type="text" placeholder="Public, minor, major, secret..." value={character.spoilerLevel} onChange={(e)=>updateCharacter("spoilerLevel",e.target.value)}/></label>
      <label className="creator-field"><span>Era / Period</span><input type="text" placeholder="500–1300 AD-inspired period..." value={character.era} onChange={(e)=>updateCharacter("era",e.target.value)}/></label>
      <label className="creator-field"><span>Apparent Age</span><input type="text" placeholder="Useful for immortal or long-lived characters..." value={character.apparentAge} onChange={(e)=>updateCharacter("apparentAge",e.target.value)}/></label>
      <label className="creator-field"><span>Pronouns</span><input type="text" placeholder="She/her, he/him, they/them..." value={character.pronouns} onChange={(e)=>updateCharacter("pronouns",e.target.value)}/></label>
      <label className="creator-field"><span>Subrace / Variant</span><input type="text" placeholder="Specific branch, hybrid, variant..." value={character.subrace} onChange={(e)=>updateCharacter("subrace",e.target.value)}/></label>
      <label className="creator-field"><span>Heritage / Ethnicity</span><input type="text" placeholder="Cultural and ancestral heritage..." value={character.heritage} onChange={(e)=>updateCharacter("heritage",e.target.value)}/></label>
      <label className="creator-field"><span>Nationality / People</span><input type="text" placeholder="Nation, kingdom, or people..." value={character.nationality} onChange={(e)=>updateCharacter("nationality",e.target.value)}/></label>
      <label className="creator-field"><span>Current Residence</span><input type="text" placeholder="Where they live now..." value={character.currentResidence} onChange={(e)=>updateCharacter("currentResidence",e.target.value)}/></label>
      <label className="creator-field"><span>Occupation / Role</span><input type="text" placeholder="Ruler, explorer, scholar, warrior..." value={character.occupation} onChange={(e)=>updateCharacter("occupation",e.target.value)}/></label>

      <label className="creator-field full-width">
        <span>Character Summary</span>
        <textarea
          rows={6}
          placeholder="Write a short introduction to this character..."
          value={character.summary}
          onChange={(e) => updateCharacter("summary", e.target.value)}
        />
      </label>
    </div>

    <div className="creator-form-actions">
      <button type="button" className="secondary-action" onClick={returnToDashboard}>
        Cancel
      </button>
      <button type="button" className="primary-action" onClick={() => saveCharacter(2)} disabled={savingCharacter}>
        {savingCharacter ? "Saving..." : "Save & Continue →"}
      </button>
    </div>
  </section>
);

const renderAppearanceStep = () => (
  <section className="creator-form-card">
    <div className="form-section-heading">
      <span className="form-section-icon">✦</span>
      <div>
        <h3>Physical Appearance</h3>
        <p>Design how this character looks in their primary form.</p>
      </div>
    </div>

    <div className="creator-form-grid">
      <label className="creator-field">
        <span>Skin Tone / Complexion</span>
        <input
          type="text"
          placeholder="Deep mahogany, light caramel..."
          value={character.skinTone}
          onChange={(e) => updateCharacter("skinTone", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Eye Color</span>
        <input
          type="text"
          placeholder="Galaxy pink, icy blue..."
          value={character.eyeColor}
          onChange={(e) => updateCharacter("eyeColor", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Hair Color</span>
        <input
          type="text"
          placeholder="Black, silver, crimson..."
          value={character.hairColor}
          onChange={(e) => updateCharacter("hairColor", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Hair Texture</span>
        <input
          type="text"
          placeholder="4C coils, locs, straight..."
          value={character.hairTexture}
          onChange={(e) => updateCharacter("hairTexture", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Hair Style</span>
        <input
          type="text"
          placeholder="Braids, long locs, afro..."
          value={character.hairStyle}
          onChange={(e) => updateCharacter("hairStyle", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Height</span>
        <input
          type="text"
          placeholder={'5′8″, 7′0″...'}
          value={character.height}
          onChange={(e) => updateCharacter("height", e.target.value)}
        />
      </label>

      <label className="creator-field"><span>Weight</span><input type="text" placeholder="Exact, approximate, or TBD..." value={character.weight} onChange={(e)=>updateCharacter("weight",e.target.value)}/></label>
      <label className="creator-field"><span>Dominant Hand</span><input type="text" placeholder="Right, left, ambidextrous, TBD..." value={character.dominantHand} onChange={(e)=>updateCharacter("dominantHand",e.target.value)}/></label>

      <label className="creator-field full-width">
        <span>Body Type / Build</span>
        <input
          type="text"
          placeholder="Lithe, athletic, muscular, broad, petite..."
          value={character.build}
          onChange={(e) => updateCharacter("build", e.target.value)}
        />
      </label>

      <label className="creator-field full-width">
        <span>Distinguishing Features</span>
        <textarea
          rows={4}
          placeholder="Scars, markings, horns, pointed ears, glowing runes, unusual eyes..."
          value={character.distinguishingFeatures}
          onChange={(e) => updateCharacter("distinguishingFeatures", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Clothing / Fashion Style</span>
        <textarea
          rows={4}
          placeholder="Describe their usual clothing, armor, robes, colors..."
          value={character.clothingStyle}
          onChange={(e) => updateCharacter("clothingStyle", e.target.value)}
        />
      </label>

      <RepeatableList label="Accessories" value={character.accessories} field="accessories" placeholder="Add jewelry, glasses, beads, crowns, charms..." />

      <label className="creator-field full-width">
        <span>Alternate / True Form</span>
        <textarea
          rows={4}
          placeholder="Dragon form, fairy form, werebeast form, transformation..."
          value={character.alternateForm}
          onChange={(e) => updateCharacter("alternateForm", e.target.value)}
        />
      </label>

      <label className="creator-field"><span>Skin HEX / Color Reference</span><input type="text" placeholder="#6B382B + undertone/highlight notes..." value={character.skinHex} onChange={(e)=>updateCharacter("skinHex",e.target.value)}/>{character.skinHex.match(/#[0-9A-Fa-f]{6}/)?.[0] && <div className="master-color-preview"><i style={{background:character.skinHex.match(/#[0-9A-Fa-f]{6}/)?.[0]}}/><small>{character.skinHex.match(/#[0-9A-Fa-f]{6}/)?.[0]}</small></div>}</label>
      <label className="creator-field"><span>Eye HEX / Color Reference</span><input type="text" placeholder="#1769C2 + inner/outer ring..." value={character.eyeHex} onChange={(e)=>updateCharacter("eyeHex",e.target.value)}/>{character.eyeHex.match(/#[0-9A-Fa-f]{6}/)?.[0] && <div className="master-color-preview"><i style={{background:character.eyeHex.match(/#[0-9A-Fa-f]{6}/)?.[0]}}/><small>{character.eyeHex.match(/#[0-9A-Fa-f]{6}/)?.[0]}</small></div>}</label>
      <label className="creator-field"><span>Hair HEX / Color Reference</span><input type="text" placeholder="#111111 + highlights/tips..." value={character.hairHex} onChange={(e)=>updateCharacter("hairHex",e.target.value)}/>{character.hairHex.match(/#[0-9A-Fa-f]{6}/)?.[0] && <div className="master-color-preview"><i style={{background:character.hairHex.match(/#[0-9A-Fa-f]{6}/)?.[0]}}/><small>{character.hairHex.match(/#[0-9A-Fa-f]{6}/)?.[0]}</small></div>}</label>
      <label className="creator-field"><span>Posture / Movement</span><textarea rows={3} placeholder="How they stand, walk, move, dominant hand..." value={character.postureMovement} onChange={(e)=>updateCharacter("postureMovement",e.target.value)}/></label>
      <label className="creator-field full-width"><span>Face Details</span><textarea rows={4} placeholder="Face shape, jawline, cheekbones, nose, lips, brows, eye shape, scars, markings..." value={character.faceDetails} onChange={(e)=>updateCharacter("faceDetails",e.target.value)}/></label>
      <label className="creator-field"><span>Makeup / Face Paint</span><textarea rows={4} placeholder="Eyeshadow, liner, lips, nails, ceremonial or magical markings and colors..." value={character.makeup} onChange={(e)=>updateCharacter("makeup",e.target.value)}/></label>
      <label className="creator-field"><span>Grooming</span><textarea rows={4} placeholder="Facial hair, brows, ceremonial grooming..." value={character.grooming} onChange={(e)=>updateCharacter("grooming",e.target.value)}/></label>
      <label className="creator-field"><span>Nails</span><textarea rows={4} placeholder="Shape, length, colors, gradient, gems, magical or metal accents..." value={character.nails} onChange={(e)=>updateCharacter("nails",e.target.value)}/></label>
      <RepeatableList label="Official Character Color Palette" value={character.colorPalette} field="colorPalette" placeholder="Add color, e.g. Steam Pink — #FF8FCB" />
      <label className="creator-field full-width"><span>Signature / Default Outfit</span><textarea rows={6} placeholder="Head, upper body, lower body, footwear, accessories, weapons carried, construction..." value={character.signatureOutfit} onChange={(e)=>updateCharacter("signatureOutfit",e.target.value)}/></label>
      <RepeatableList label="Outfit Color Breakdown" value={character.outfitColors} field="outfitColors" placeholder="Add garment/color, e.g. Trim — Gold #D9B65D" />
      <label className="creator-field"><span>Outfit Materials / Construction</span><textarea rows={6} placeholder="Linen, silk, wool, leather, metal, enchanted fabric; layered, wrapped, buckled..." value={character.outfitMaterials} onChange={(e)=>updateCharacter("outfitMaterials",e.target.value)}/></label>
      <RepeatableList label="Wardrobe / Alternate Outfits" value={character.wardrobe} field="wardrobe" placeholder="Add outfit, e.g. Outfit 02 — Casual" />

      <label className="creator-field full-width">
        <span>Additional Appearance Notes</span>
        <textarea
          rows={5}
          placeholder="Makeup, aura, color palette, expressions, visual effects, other design notes..."
          value={character.appearanceNotes}
          onChange={(e) => updateCharacter("appearanceNotes", e.target.value)}
        />
      </label>
    </div>

    <div className="creator-form-actions">
      <button type="button" className="secondary-action" onClick={() => goToCreatorStep(1)}>
        ← Back
      </button>
      <button type="button" className="primary-action" onClick={() => saveCharacter(3)} disabled={savingCharacter}>
        {savingCharacter ? "Saving..." : "Save & Continue →"}
      </button>
    </div>
  </section>
);

const renderOriginLoreStep = () => (
  <section className="creator-form-card">
    <div className="form-section-heading">
      <span className="form-section-icon">✦</span>
      <div>
        <h3>Origin &amp; Lore</h3>
        <p>Build the history, culture, personality, and story that shaped this character.</p>
      </div>
    </div>

    <div className="creator-form-grid">
      <label className="creator-field">
        <span>Birthplace / Place of Origin</span>
        <input
          type="text"
          placeholder="City, village, realm, hidden territory..."
          value={character.birthplace}
          onChange={(e) => updateCharacter("birthplace", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Family / Bloodline</span>
        <select value={linkedFamilyId} onChange={(e) => linkWorldRecord("family", e.target.value)}>
          <option value="">Custom / not linked</option>
          {worldRecords.filter((item) => item.record_type === "family").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>

      <label className="creator-field">
        <span>Family / Lineage</span>
        <input
          type="text"
          placeholder="Parents, bloodline, ancestry, dynasty..."
          value={character.lineage}
          onChange={(e) => updateCharacter("lineage", e.target.value)}
        />
      </label>

      <label className="creator-field full-width">
        <span>Culture / Heritage</span>
        <textarea
          rows={4}
          placeholder="Traditions, people, language, customs, beliefs, heritage..."
          value={character.culture}
          onChange={(e) => updateCharacter("culture", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Childhood / Early Life</span>
        <textarea
          rows={5}
          placeholder="What was their childhood like? Who raised them? What shaped their early years?"
          value={character.childhood}
          onChange={(e) => updateCharacter("childhood", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Major Life Events</span>
        <textarea
          rows={5}
          placeholder="Wars, losses, discoveries, betrayals, awakenings, turning points..."
          value={character.majorLifeEvents}
          onChange={(e) => updateCharacter("majorLifeEvents", e.target.value)}
        />
      </label>

      <label className="creator-field full-width">
        <span>Full Backstory</span>
        <textarea
          rows={8}
          placeholder="Tell the character's story from their origin to where they are now..."
          value={character.backstory}
          onChange={(e) => updateCharacter("backstory", e.target.value)}
        />
      </label>

      <label className="creator-field full-width">
        <span>Personality</span>
        <textarea
          rows={4}
          placeholder="Temperament, habits, humor, emotional traits, strengths, flaws..."
          value={character.personality}
          onChange={(e) => updateCharacter("personality", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Motivations</span>
        <textarea
          rows={4}
          placeholder="What drives them? What keeps them moving forward?"
          value={character.motivations}
          onChange={(e) => updateCharacter("motivations", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Goals / Ambitions</span>
        <textarea
          rows={4}
          placeholder="What are they trying to accomplish?"
          value={character.goals}
          onChange={(e) => updateCharacter("goals", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Fears / Inner Conflicts</span>
        <textarea
          rows={4}
          placeholder="Fears, regrets, insecurities, internal struggles..."
          value={character.fears}
          onChange={(e) => updateCharacter("fears", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Beliefs / Worldview</span>
        <textarea
          rows={4}
          placeholder="Values, philosophy, faith, loyalties, view of the world..."
          value={character.beliefs}
          onChange={(e) => updateCharacter("beliefs", e.target.value)}
        />
      </label>

      <label className="creator-field"><span>Voice / Speech</span><textarea rows={5} placeholder="Voice type, pitch, accent, dialect, languages, vocabulary, verbal habits, battle voice..." value={character.voiceSpeech} onChange={(e)=>updateCharacter("voiceSpeech",e.target.value)}/></label>
      <label className="creator-field"><span>Psychology / Inner Character</span><textarea rows={5} placeholder="Core desire, emotional wound, fatal flaw, moral boundary, breaking point, secrets, internal conflict..." value={character.psychology} onChange={(e)=>updateCharacter("psychology",e.target.value)}/></label>
      <label className="creator-field"><span>Lifestyle / Everyday Life</span><textarea rows={5} placeholder="Home, routine, food, hobbies, music, transportation, pets, sleep, possessions..." value={character.lifestyle} onChange={(e)=>updateCharacter("lifestyle",e.target.value)}/></label>
      <label className="creator-field"><span>Likes / Dislikes / Preferences</span><textarea rows={5} placeholder="Favorites, dislikes, comforts, pet peeves, interests, obsessions, guilty pleasures..." value={character.likesDislikes} onChange={(e)=>updateCharacter("likesDislikes",e.target.value)}/></label>

      <label className="creator-field full-width">
        <span>Current Story Role</span>
        <textarea
          rows={4}
          placeholder="Where are they now, and what role do they currently play in the Umbral World?"
          value={character.storyRole}
          onChange={(e) => updateCharacter("storyRole", e.target.value)}
        />
      </label>
      <label className="creator-field full-width"><span>Character Arc / Story Information</span><textarea rows={6} placeholder="First appearance, current objective, starting state, turning points, ending state, unresolved threads, spoiler notes..." value={character.storyArc} onChange={(e)=>updateCharacter("storyArc",e.target.value)}/></label>
    </div>

    <div className="creator-form-actions">
      <button type="button" className="secondary-action" onClick={() => goToCreatorStep(2)}>
        ← Back
      </button>
      <button type="button" className="primary-action" onClick={() => saveCharacter(4)} disabled={savingCharacter}>
        {savingCharacter ? "Saving..." : "Save & Continue →"}
      </button>
    </div>
  </section>
);

const renderAbilitiesStep = () => (
  <section className="creator-form-card">
    <div className="form-section-heading">
      <span className="form-section-icon">✦</span>
      <div>
        <h3>Abilities &amp; Combat</h3>
        <p>Define the powers, techniques, weapons, strengths, and limits that shape this character in battle.</p>
      </div>
    </div>

    <div className="creator-form-grid">
      <label className="creator-field">
        <span>Power Source / Magic Type</span>
        <input
          type="text"
          placeholder="Umbral Genesis, fire, runes, spiritual energy..."
          value={character.powerSource}
          onChange={(e) => updateCharacter("powerSource", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Combat Style</span>
        <input
          type="text"
          placeholder="Martial arts, swordsmanship, ranged, magical..."
          value={character.combatStyle}
          onChange={(e) => updateCharacter("combatStyle", e.target.value)}
        />
      </label>

      <RepeatableList label="Primary Abilities / Powers" value={character.primaryAbilities} field="primaryAbilities" placeholder="Add a power, e.g. Steam Manipulation" />

      <RepeatableList label="Secondary Abilities" value={character.secondaryAbilities} field="secondaryAbilities" placeholder="Add a passive, resistance, sense..." />

      <RepeatableList label="Signature Techniques" value={character.signatureTechniques} field="signatureTechniques" placeholder="Add a named technique..." />

      <RepeatableList label="Weapons / Equipment" value={character.weapons} field="weapons" placeholder="Add a weapon, artifact, armor..." />

      <label className="creator-field full-width"><span>Combat Profile</span><textarea rows={6} placeholder="Preferred range, unarmed style, defense, speed, strength, endurance, agility, tactical behavior, battlefield role, preferred tactics..." value={character.combatProfile} onChange={(e)=>updateCharacter("combatProfile",e.target.value)}/></label>

      <label className="creator-field full-width"><span>Weapon / Equipment Details</span><textarea rows={5} placeholder="Names, creators, materials, colors, dimensions, abilities, history, where carried..." value={character.weaponDetails} onChange={(e)=>updateCharacter("weaponDetails",e.target.value)}/></label>

      <label className="creator-field full-width">
        <span>Transformations / Power States</span>
        <textarea
          rows={5}
          placeholder="Dragon forms, awakened states, transformations, modes..."
          value={character.transformations}
          onChange={(e) => updateCharacter("transformations", e.target.value)}
        />
      </label>

      <label className="creator-field full-width"><span>Transformation Details</span><textarea rows={6} placeholder="Trigger, sequence, size, anatomy, palette, aura, abilities gained/lost, mental/voice/clothing changes, limits..." value={character.transformationDetails} onChange={(e)=>updateCharacter("transformationDetails",e.target.value)}/></label>

      <label className="creator-field">
        <span>Strengths</span>
        <textarea
          rows={4}
          placeholder="What are they especially powerful or skilled at?"
          value={character.strengths}
          onChange={(e) => updateCharacter("strengths", e.target.value)}
        />
      </label>

      <label className="creator-field">
        <span>Weaknesses</span>
        <textarea
          rows={4}
          placeholder="Physical, magical, emotional, tactical weaknesses..."
          value={character.weaknesses}
          onChange={(e) => updateCharacter("weaknesses", e.target.value)}
        />
      </label>

      <label className="creator-field full-width">
        <span>Limits / Costs / Conditions</span>
        <textarea
          rows={4}
          placeholder="Cooldowns, energy costs, conditions, consequences, restrictions..."
          value={character.limitations}
          onChange={(e) => updateCharacter("limitations", e.target.value)}
        />
      </label>

      <label className="creator-field full-width">
        <span>Additional Ability Notes</span>
        <textarea
          rows={4}
          placeholder="Power colors, visual effects, special rules, other combat notes..."
          value={character.abilityNotes}
          onChange={(e) => updateCharacter("abilityNotes", e.target.value)}
        />
      </label>
    </div>

    <div className="creator-form-actions">
      <button type="button" className="secondary-action" onClick={() => goToCreatorStep(3)}>
        ← Back
      </button>
      <button type="button" className="primary-action" onClick={() => saveCharacter(5)} disabled={savingCharacter}>
        {savingCharacter ? "Saving..." : "Save & Continue →"}
      </button>
    </div>
  </section>
);

const renderRelationshipsStep = () => (
  <section className="creator-form-card">
    <div className="form-section-heading">
      <span className="form-section-icon">✦</span>
      <div>
        <h3>Relationships</h3>
        <p>Map the family, allies, rivals, mentors, enemies, and bonds surrounding this character.</p>
      </div>
    </div>

    <style>{`
      .connection-builder{padding:20px;border:1px solid rgba(229,189,87,.18);border-radius:18px;background:rgba(18,8,21,.5);margin-bottom:24px}
      .connection-builder h4{margin:0 0 6px;color:#f0d481;font-family:Georgia,serif;font-size:22px}.connection-builder>p{margin:0 0 16px;color:#9f8ba2}
      .connection-controls{display:grid;grid-template-columns:1fr 1fr auto;gap:10px}.connection-controls select{padding:12px;border-radius:10px;border:1px solid rgba(185,92,209,.25);background:#110914;color:#eee}
      .connection-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:16px}.connection-chip{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid rgba(185,92,209,.18);border-radius:14px;background:#0d0811}.connection-chip img,.connection-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;background:#1b0c20;display:grid;place-items:center;color:#e5bd57}.connection-chip-copy{flex:1}.connection-chip-copy strong{display:block;color:#ead180}.connection-chip-copy span{font-size:12px;color:#b68abe;text-transform:capitalize}.connection-remove{border:0;background:transparent;color:#c98b99;cursor:pointer;font-size:18px}
      .written-relations-title{grid-column:1/-1;margin:8px 0 0;color:#d7bddb;font-family:Georgia,serif;font-size:20px}
      @media(max-width:700px){.connection-controls{grid-template-columns:1fr}}
    `}</style>
    <div className="connection-builder">
      <h4>Connected Characters</h4>
      <p>Link this character directly to another character you created. Reciprocal family and relationship links are created automatically.</p>
      {relationshipError && <p className="login-error">{relationshipError}</p>}
      <div className="connection-controls">
        <select value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)}>
          <option value="parent">Parent</option><option value="child">Child</option><option value="sibling">Sibling</option><option value="partner">Partner / Love Interest</option><option value="ally">Friend / Ally</option><option value="rival">Rival</option><option value="enemy">Enemy</option><option value="mentor">Mentor</option><option value="student">Student / Protégé</option>
        </select>
        <select value={relationshipTargetId} onChange={(e) => setRelationshipTargetId(e.target.value)}>
          <option value="">Choose one of your characters...</option>
          {relationshipOptions.map((item) => <option key={item.id} value={item.id}>{item.name || "Unnamed Character"}{item.identity?.alias ? ` — ${item.identity.alias}` : ""}</option>)}
        </select>
        <button type="button" className="primary-action" disabled={!relationshipTargetId || relationshipBusy} onClick={() => void addConnectedRelationship()}>{relationshipBusy ? "Saving..." : "Connect"}</button>
      </div>
      {connectedRelationships.length > 0 && <div className="connection-list">{connectedRelationships.map((link) => { const target=link.target; const image=target?.portrait_url || target?.media?.portraitUrl || ""; return <div className="connection-chip" key={link.id}>{image ? <img src={image} alt="" /> : <div className="connection-avatar">☾</div>}<div className="connection-chip-copy"><strong>{target?.name || "Character"}</strong><span>{link.relationship_type}</span></div><button type="button" className="connection-remove" title="Remove connection" onClick={() => void removeConnectedRelationship(link)}>×</button></div>})}</div>}
    </div>

    <div className="creator-form-grid">
      <h4 className="written-relations-title">Written Relationship Details</h4>
      <RepeatableList label="Parents / Guardians" value={character.parents} field="parents" placeholder="Add a parent or guardian..." />

      <RepeatableList label="Siblings" value={character.siblings} field="siblings" placeholder="Add a sibling..." />

      <RepeatableList label="Children / Descendants" value={character.children} field="children" placeholder="Add a child or descendant..." />

      <RepeatableList label="Partner / Love Interest" value={character.partner} field="partner" placeholder="Add a partner or love interest..." />

      <RepeatableList label="Friends / Allies" value={character.allies} field="allies" placeholder="Add a friend or ally..." />

      <RepeatableList label="Rivals" value={character.rivals} field="rivals" placeholder="Add a rival..." />

      <RepeatableList label="Enemies" value={character.enemies} field="enemies" placeholder="Add an enemy..." />

      <RepeatableList label="Mentors / Students" value={character.mentors} field="mentors" placeholder="Add a mentor or student..." />

      <label className="creator-field full-width"><span>World Connections</span><textarea rows={6} placeholder="Realm → region → homeland → birthplace; race/subrace; faction/clan/house; bloodline; religion; organizations; historical events; important locations..." value={character.worldConnections} onChange={(e)=>updateCharacter("worldConnections",e.target.value)}/></label>

      <label className="creator-field full-width">
        <span>Relationship Notes</span>
        <textarea
          rows={6}
          placeholder="Family dynamics, complicated bonds, betrayals, loyalties, relationship history..."
          value={character.relationshipNotes}
          onChange={(e) => updateCharacter("relationshipNotes", e.target.value)}
        />
      </label>
    </div>

    <div className="creator-form-actions">
      <button type="button" className="secondary-action" onClick={() => goToCreatorStep(4)}>
        ← Back
      </button>
      <button type="button" className="primary-action" onClick={() => saveCharacter(6)} disabled={savingCharacter}>
        {savingCharacter ? "Saving..." : "Save & Continue →"}
      </button>
    </div>
  </section>
);

const renderMediaStep = () => (
  <section className="creator-form-card">
    <style>{`
      .master-color-preview{display:flex;align-items:center;gap:9px;margin-top:8px;color:#bbaabd}.master-color-preview i{width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 0 0 1px rgba(0,0,0,.22)}.master-color-preview small{font-family:monospace;font-size:12px}
      .repeatable-add-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px}.repeatable-add-row .secondary-action{min-width:92px}.repeatable-chip-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.repeatable-chip{display:flex;align-items:center;gap:8px;max-width:100%;padding:8px 10px;border:1px solid rgba(185,92,209,.25);border-radius:999px;background:rgba(31,13,35,.72);color:#dfcfe1}.repeatable-chip span{overflow-wrap:anywhere}.repeatable-chip button{border:0;background:transparent;color:#d99be4;font-size:18px;cursor:pointer}.repeatable-empty{color:#806f83;margin-top:8px}
      .media-upload-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:22px 0;width:100%;min-width:0}
      .media-upload-card{min-width:0;overflow:hidden;border:1px solid rgba(185,92,209,.2);border-radius:16px;padding:16px;box-sizing:border-box;background:rgba(18,8,21,.55);display:flex;flex-direction:column;align-items:stretch}
      .media-upload-card strong{display:block;min-height:38px;color:#e8c96f;margin-bottom:10px;line-height:1.35}
      .media-upload-card input[type=file]{display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;color:#bbaabd;font-size:12px;overflow:hidden}
      .media-upload-card input[type=file]::file-selector-button{max-width:100%;margin:0 8px 8px 0;padding:8px 10px;border:1px solid rgba(232,201,111,.3);border-radius:9px;background:#170d1b;color:#ead080;cursor:pointer}
      .media-thumb{width:100%;height:190px;object-fit:cover;border-radius:12px;margin-bottom:12px;background:#09060c}
      .media-gallery-editor{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0}
      .media-gallery-item{position:relative}.media-gallery-item img{width:100%;height:180px;object-fit:cover;border-radius:12px}
      .media-gallery-item button{position:absolute;right:8px;top:8px;border:0;border-radius:999px;background:rgba(8,5,12,.88);color:#fff;width:30px;height:30px;cursor:pointer}
      .upload-help{color:#9f8ba2;font-size:12px;line-height:1.6;margin-top:8px}
      @media(max-width:1050px){.media-upload-grid{grid-template-columns:1fr}.media-thumb{height:min(320px,42vw)}}
    `}</style>
    <div className="form-section-heading">
      <span className="form-section-icon">✦</span>
      <div>
        <h3>Media &amp; References</h3>
        <p>Upload character artwork directly or keep using an existing image URL.</p>
      </div>
    </div>

    {mediaUploadError && <p className="login-error" role="alert">{mediaUploadError}</p>}

    <div className="media-upload-grid">
      {[
        { kind:"portrait" as const, label:"Character Portrait", url:character.portraitUrl },
        { kind:"reference" as const, label:"Reference / Production Sheet", url:character.referenceArtUrl },
        { kind:"alternate" as const, label:"Alternate / True Form", url:character.alternateFormUrl },
      ].map((item) => (
        <div className="media-upload-card" key={item.kind}>
          <strong>{item.label}</strong>
          {item.url && <img className="media-thumb" src={item.url} alt={item.label} />}
          <input type="file" accept="image/*" disabled={uploadingMedia !== null} onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadCharacterImage(file, item.kind);
            e.currentTarget.value = "";
          }} />
          <p className="upload-help">{uploadingMedia === item.kind ? "Uploading..." : "PNG, JPG, WEBP or GIF • max 10 MB"}</p>
        </div>
      ))}
    </div>

    <div className="creator-form-grid">
      <label className="creator-field full-width">
        <span>Portrait URL (optional fallback)</span>
        <input type="url" placeholder="https://..." value={character.portraitUrl} onChange={(e) => updateCharacter("portraitUrl", e.target.value)} />
      </label>
      <label className="creator-field">
        <span>Reference Art URL (optional fallback)</span>
        <input type="url" placeholder="https://..." value={character.referenceArtUrl} onChange={(e) => updateCharacter("referenceArtUrl", e.target.value)} />
      </label>
      <label className="creator-field">
        <span>Alternate Form URL (optional fallback)</span>
        <input type="url" placeholder="https://..." value={character.alternateFormUrl} onChange={(e) => updateCharacter("alternateFormUrl", e.target.value)} />
      </label>

      <div className="creator-field full-width">
        <span>Gallery Images</span>
        <input type="file" accept="image/*" multiple disabled={uploadingMedia !== null} onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          for (const file of files) await uploadCharacterImage(file, "gallery");
          e.currentTarget.value = "";
        }} />
        <p className="upload-help">Choose multiple images. They will appear on the finished character profile.</p>
        {character.galleryUrls.length > 0 && <div className="media-gallery-editor">{character.galleryUrls.map((url, index) => <div className="media-gallery-item" key={url}><img src={url} alt={`Gallery ${index + 1}`} /><button type="button" title="Remove from profile" onClick={() => removeGalleryImage(url)}>×</button></div>)}</div>}
      </div>

      <label className="creator-field full-width">
        <span>External Gallery / Video / Folder URL (optional)</span>
        <input type="url" placeholder="https://..." value={character.galleryUrl} onChange={(e) => updateCharacter("galleryUrl", e.target.value)} />
      </label>

      <label className="creator-field full-width"><span>Visual Production Asset Checklist</span><textarea rows={8} placeholder={"Official portrait — Done / Needed\nFull-body front — Done / Needed\nBack / left / right views\nFace, eye, hair, makeup, nails\nOutfit breakdown\nWeapon reference\nTransformation / alternate form\nExpression and combat references"} value={character.visualAssets} onChange={(e)=>updateCharacter("visualAssets",e.target.value)}/></label>
      <label className="creator-field full-width"><span>Blender / VRoid Production Notes</span><textarea rows={7} placeholder="Model scale, material separation, shaders, hair pieces, rigging notes, texture rules, production colors..." value={character.productionNotes} onChange={(e)=>updateCharacter("productionNotes",e.target.value)}/></label>
      <label className="creator-field"><span>Canon Locks</span><textarea rows={7} placeholder="Facts Studio and AI must not change without approval..." value={character.canonLocks} onChange={(e)=>updateCharacter("canonLocks",e.target.value)}/></label>
      <label className="creator-field"><span>Editable / TBD Fields</span><textarea rows={7} placeholder="Facts not established yet. Keep these editable; do not let AI autofill them as canon..." value={character.tbdFields} onChange={(e)=>updateCharacter("tbdFields",e.target.value)}/></label>

      <label className="creator-field full-width">
        <span>Media Notes</span>
        <textarea rows={6} placeholder="Artwork credits, design notes, reference details..." value={character.mediaNotes} onChange={(e) => updateCharacter("mediaNotes", e.target.value)} />
      </label>
    </div>

    <div className="creator-form-actions">
      <button type="button" className="secondary-action" onClick={() => goToCreatorStep(5)}>← Back</button>
      <button type="button" className="primary-action" onClick={() => saveCharacter(6, true)} disabled={savingCharacter || uploadingMedia !== null}>
        {savingCharacter ? "Saving..." : uploadingMedia ? "Uploading..." : "Finish Character ✓"}
      </button>
    </div>
  </section>
);

const renderComingSoonStep = () => (
  <section className="creator-form-card">
    <div className="form-section-heading">
      <span className="form-section-icon">✦</span>
      <div>
        <h3>{stepTitles[creatorStep - 1]}</h3>
        <p>This section is ready for us to build next.</p>
      </div>
    </div>

    <div className="creator-form-actions">
      <button
        type="button"
        className="secondary-action"
        onClick={() => goToCreatorStep(Math.max(1, creatorStep - 1))}
      >
        ← Back
      </button>
      {creatorStep < 6 && (
        <button
          type="button"
          className="primary-action"
          onClick={() => goToCreatorStep(creatorStep + 1)}
        >
          Continue →
        </button>
      )}
    </div>
  </section>
);

return (
  <main className="creator-page">
    <header className="creator-topbar">
      <button
        type="button"
        className="brand-button"
        onClick={returnToDashboard}
        aria-label="Return to Umbra Studio dashboard"
      >
        <span className="brand-moon">☾</span>
        <span className="brand-button-copy">
          <span className="header-eyebrow">UMBRA CONNECT</span>
          <strong>Umbra Studio</strong>
        </span>
      </button>

      <div className="creator-topbar-actions">
        <span className="draft-status">
          {character.name.trim() || "New Character"}
        </span>
        <button type="button" className="back-button" onClick={returnToDashboard}>
          ← Back to Studio
        </button>
      </div>
    </header>

    <section className="creator-layout">
      <aside className="creator-sidebar">
        <div className="creator-sidebar-intro">
          <span className="creator-kicker">CHARACTER CREATION</span>
          <h2>Forge a New Soul</h2>
          <p>
            Build the identity, appearance, lore, abilities, and relationships
            of your next Umbral character.
          </p>
        </div>

        <nav className="creator-nav" aria-label="Character creator sections">
          {navItems.map((item, index) => {
            const step = index + 1;
            return (
              <button
                key={item}
                type="button"
                className={`creator-nav-item ${creatorStep === step ? "active" : ""}`}
                onClick={() => goToCreatorStep(step)}
              >
                <span>{String(step).padStart(2, "0")}</span>
                {item}
              </button>
            );
          })}
        </nav>

        <div className="creator-sidebar-note">
          <span>✦</span>
          <p>Your character will remain private while you build their profile.</p>
        </div>
      </aside>

      <section className="creator-main">
        <div className="creator-heading">
          <div>
            <span className="creator-kicker">
              STEP {String(creatorStep).padStart(2, "0")}
            </span>
            <h1>{stepTitles[creatorStep - 1]}</h1>
            <p>{stepDescriptions[creatorStep - 1]}</p>
          </div>

          <div className="creator-progress">
            <span>{creatorStep} of 6</span>
            <div className="creator-progress-track">
              <div
                className="creator-progress-fill"
                style={{ width: `${(creatorStep / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {saveError && (
          <p className="login-error" role="alert">
            Save failed: {saveError}
          </p>
        )}

        <div className="creator-workspace">
          {creatorStep === 1
            ? renderIdentityStep()
            : creatorStep === 2
              ? renderAppearanceStep()
              : creatorStep === 3
                ? renderOriginLoreStep()
                : creatorStep === 4
                  ? renderAbilitiesStep()
                  : creatorStep === 5
                    ? renderRelationshipsStep()
                    : creatorStep === 6
                      ? renderMediaStep()
                      : renderComingSoonStep()}

          <aside className="character-preview-card">
            <div className="preview-image-placeholder">
              {character.portraitUrl.trim() ? (
                <img
                  src={character.portraitUrl}
                  alt={`${character.name.trim() || "Character"} portrait`}
                  className="character-preview-image"
                />
              ) : (
                <>
                  <div className="preview-moon">☾</div>
                  <span>Character Portrait</span>
                  <small>Upload a portrait in the Media section.</small>
                </>
              )}
            </div>

            <div className="preview-copy">
              <span className="creator-kicker">LIVE PROFILE</span>
              <h3>{character.name.trim() || "Unnamed Character"}</h3>
              {character.alias.trim() && <strong>{character.alias}</strong>}
              <p>
                {character.summary.trim() ||
                  (creatorStep === 2 && character.race.trim()
                    ? `${character.race}${character.homeland.trim() ? ` • ${character.homeland}` : ""}`
                    : "Your character preview will develop as you complete each section.")}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </section>
  </main>
);

}


if(page==="messages"){
 const others=adminMembers.filter(m=>m.user_id!==session?.user.id);
 const activeId=messageRecipientId||others[0]?.user_id||"";
 const activeMember=others.find(m=>m.user_id===activeId);
 const thread=directMessages.filter(m=>activeId&&(m.sender_user_id===activeId||m.recipient_user_id===activeId));
 const unreadFrom=(id:string)=>directMessages.filter(m=>m.sender_user_id===id&&m.recipient_user_id===session?.user.id&&!m.read_at).length;
 return <main className="dashboard-shell studio-messages-page"><header className="studio-header"><button className="brand-button" onClick={()=>setPage("dashboard")}><div className="brand-moon">☾</div><div className="brand-button-copy"><span className="header-eyebrow">UMBRA CONNECT</span><strong>Umbra Studio</strong></div></button><div className="account-area"><span className="admin-role-pill">MESSAGES</span><button className="back-button" onClick={()=>setPage("dashboard")}>Dashboard</button></div></header><section className="v101-shell"><div className="production-v9-hero"><div><p className="eyebrow">PRIVATE STUDIO COMMUNICATION</p><h1>Studio Messages</h1><p>Direct conversations between authorized Umbra Studio collaborators. Notifications and review comments remain separate.</p></div><button className="secondary-action" onClick={()=>void loadDirectMessages()}>{messagesBusy?"Refreshing...":"Refresh"}</button></div>{messagesError&&<p className="login-error">{messagesError}</p>}<div className="v101-message-layout"><aside className="v101-conversations"><h3>Collaborators</h3>{others.map(m=><button key={m.user_id} className={activeId===m.user_id?"active":""} onClick={()=>{setMessageRecipientId(m.user_id);void markConversationRead(m.user_id)}}><div><strong>{m.display_name||m.email||"Studio Member"}</strong><small>{m.role.replace(/_/g," ")}</small></div>{unreadFrom(m.user_id)>0&&<span>{unreadFrom(m.user_id)}</span>}</button>)}{others.length===0&&<p className="admin-empty">Add another Studio collaborator to begin messaging.</p>}</aside><section className="v101-thread"><div className="v101-thread-head"><div><span>CONVERSATION</span><h2>{activeMember?.display_name||activeMember?.email||"Choose a collaborator"}</h2></div></div><div className="v101-message-scroll">{thread.map(m=>{const mine=m.sender_user_id===session?.user.id;return <article key={m.id} className={mine?"mine":"theirs"}><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}{mine?m.read_at?" • Read":" • Sent":""}</small></article>})}{activeId&&thread.length===0&&<p className="admin-empty">No messages yet. Start the conversation below.</p>}</div>{activeId&&<div className="v101-compose"><textarea placeholder={`Message ${activeMember?.display_name||activeMember?.email||"collaborator"}...`} value={messageBody} onChange={e=>setMessageBody(e.target.value)} maxLength={10000}/><button className="primary-action" disabled={!messageBody.trim()||messagesBusy} onClick={()=>void sendDirectMessage()}>Send Message</button></div>}</section></div></section></main>;
}

if(page==="transfer"){
 return <main className="dashboard-shell v101-transfer-page"><header className="studio-header"><button className="brand-button" onClick={()=>setPage("dashboard")}><div className="brand-moon">☾</div><div className="brand-button-copy"><span className="header-eyebrow">UMBRA CONNECT</span><strong>Umbra Studio</strong></div></button><div className="account-area"><span className="admin-role-pill">BACKUP & TRANSFER</span><button className="back-button" onClick={()=>setPage("dashboard")}>Dashboard</button></div></header><section className="v101-shell"><div className="production-v9-hero"><div><p className="eyebrow">SAFETY • PORTABILITY • COLLABORATION</p><h1>Backup & Transfer Center</h1><p>Keep local safety copies of Studio data and set up another administrator without splitting the live Umbra database.</p></div></div><div className="v101-transfer-grid"><section className="admin-panel"><span className="card-label">LOCAL SAFETY COPY</span><h2>Download Studio Backup</h2><p className="admin-help">Downloads a Studio 1.0 JSON archive to this computer. Keep dated copies somewhere safe. This file is for backup/recovery—not live collaboration.</p><button className="primary-action" onClick={exportStudioData}>Download Complete Studio Backup</button></section><section className="admin-panel"><span className="card-label">SUPABASE SNAPSHOT</span><h2>Create Cloud Backup</h2><p className="admin-help">Create a named server-side snapshot before major edits or imports.</p>{adminRole==="primary_admin"?<div className="database-backup-actions"><input placeholder="Backup label" value={backupLabel} onChange={e=>setBackupLabel(e.target.value)}/><button className="primary-action" onClick={()=>void createStudioBackup()}>Create Cloud Backup</button></div>:<p className="admin-help">Only a Primary Admin can create server snapshots.</p>}<div className="admin-feed">{backups.slice(0,8).map(b=><div className="admin-feed-row" key={b.id}><strong>{b.label}</strong><span>{new Date(b.created_at).toLocaleString()}</span></div>)}</div></section><section className="admin-panel"><span className="card-label">RECOVERY CHECK</span><h2>Validate Backup File</h2><p className="admin-help">Choose a downloaded Studio backup. Validation reads it locally and does not change Supabase.</p><input type="file" accept="application/json,.json" onChange={e=>validateBackupFile(e.target.files?.[0]||null)}/>{backupValidation&&<div className={backupValidation.ok?"v101-valid":"v101-invalid"}><strong>{backupValidation.ok?"✓ Valid backup":"⚠ Backup problem"}</strong><p>{backupValidation.message}</p>{backupValidation.summary&&<small>{backupValidation.summary}</small>}</div>}<p className="admin-help"><strong>Restore safety:</strong> automatic destructive restore is intentionally not performed from this screen. A validated backup should be restored only after creating a fresh cloud snapshot and reviewing what will be replaced.</p></section><section className="admin-panel v101-admin-setup"><span className="card-label">OTHER ADMIN COMPUTER</span><h2>Set Up Another Administrator</h2><ol><li>Keep this Supabase project as the single live database.</li><li>Make sure the other person has their own Umbra Connect account and is listed in Admin Center → Team.</li><li>Send them the current Umbra Studio Desktop installer or your permanent Studio download page.</li><li>The installed desktop app already targets the shared Umbra Studio backend; they do not configure Supabase or download a database.</li><li>They sign in with their own authorized Umbra Connect account. Do not share your password.</li><li>Both computers use the same live characters, lore, story production, messages, assignments, and changes automatically.</li><li>Future database/content edits require no reinstall. Application feature updates are delivered as signed Umbra Studio Desktop releases.</li></ol><p className="admin-help">Do not import the downloaded JSON onto their computer for everyday collaboration. That would create a separate copy instead of a shared Studio.</p></section></div></section></main>;
}

if(page==="settings"){
 return <main className="dashboard-shell v10-settings-page"><header className="studio-header"><button className="brand-button" onClick={()=>setPage("dashboard")}><div className="brand-moon">☾</div><div className="brand-button-copy"><span className="header-eyebrow">UMBRA CONNECT</span><strong>{studioSettings?.studio_name||"Umbra Studio"}</strong></div></button><div className="account-area"><span className="admin-role-pill">{`STUDIO ${appVersion}`}</span><button className="back-button" onClick={()=>setPage("dashboard")}>Dashboard</button></div></header><section className="v10-settings-shell"><div className="production-v9-hero"><div><p className="eyebrow">{`UMBRA STUDIO ${appVersion}`}</p><h1>Studio Settings</h1><p>Control production defaults, autosave behavior, collaborator presence, and dashboard preferences without changing your lore.</p></div></div>{settingsError&&<p className="login-error">{settingsError}</p>}{studioSettings&&<section className="admin-panel"><div className="v10-settings-grid"><label>Studio Name<input value={studioSettings.studio_name} disabled={adminRole!=="primary_admin"} onChange={e=>setStudioSettings({...studioSettings,studio_name:e.target.value})}/></label><label>Dashboard Subtitle<input value={studioSettings.studio_subtitle} disabled={adminRole!=="primary_admin"} onChange={e=>setStudioSettings({...studioSettings,studio_subtitle:e.target.value})}/></label><label>Default Canon Status<select value={studioSettings.default_canon_status} disabled={adminRole!=="primary_admin"} onChange={e=>setStudioSettings({...studioSettings,default_canon_status:e.target.value})}><option value="concept">Concept</option><option value="draft_canon">Draft Canon</option><option value="canon">Canon</option></select></label><label>Default Spoiler Level<select value={studioSettings.default_spoiler_level} disabled={adminRole!=="primary_admin"} onChange={e=>setStudioSettings({...studioSettings,default_spoiler_level:e.target.value})}><option value="private">Private</option><option value="public">Public</option><option value="spoiler">Spoiler</option><option value="major_spoiler">Major Spoiler</option></select></label><label className="v10-toggle"><input type="checkbox" checked={studioSettings.autosave_enabled} disabled={adminRole!=="primary_admin"} onChange={e=>setStudioSettings({...studioSettings,autosave_enabled:e.target.checked})}/> Automatic local recovery drafts</label><label>Autosave Delay (seconds)<input type="number" min="5" max="300" value={studioSettings.autosave_seconds} disabled={adminRole!=="primary_admin"} onChange={e=>setStudioSettings({...studioSettings,autosave_seconds:Number(e.target.value)})}/></label><label>Presence Timeout (minutes)<input type="number" min="2" max="120" value={studioSettings.stale_session_minutes} disabled={adminRole!=="primary_admin"} onChange={e=>setStudioSettings({...studioSettings,stale_session_minutes:Number(e.target.value)})}/></label><label className="v10-toggle"><input type="checkbox" checked={studioSettings.show_dashboard_activity} disabled={adminRole!=="primary_admin"} onChange={e=>setStudioSettings({...studioSettings,show_dashboard_activity:e.target.checked})}/> Show collaborator activity on dashboard</label></div>{adminRole==="primary_admin"?<button className="primary-action" disabled={settingsBusy} onClick={()=>void saveStudioSettings()}>{settingsBusy?"Saving...":"Save Studio Settings"}</button>:<p className="admin-help">Studio-wide settings are read-only for your role. A Primary Admin can change them.</p>}</section>}<section className="admin-panel"><span className="card-label">STUDIO 1.0 SAFETY</span><h2>Recovery & Collaboration</h2><p className="admin-help">Database lore editing now creates automatic local recovery drafts while you work. Collaborator presence uses heartbeat freshness so abandoned browser sessions can be treated as stale instead of permanently active.</p></section><StudioUpdateCenter /></section></main>;
}

if(page==="production"){
 const projectName=(id:string|null)=>storyProjects.find(x=>x.id===id)?.title||"Unassigned";
 const arcName=(id:string|null)=>storyArcs.find(x=>x.id===id)?.title||"No arc";
 const personName=(id:string|null)=>adminMembers.find(x=>x.user_id===id)?.display_name||adminMembers.find(x=>x.user_id===id)?.email||"Studio Member";
 const filteredScenes=storyScenes.filter(x=>[x.title,x.summary,x.era,x.story_date,projectName(x.project_id),arcName(x.arc_id)].filter(Boolean).join(" ").toLowerCase().includes(productionSearch.toLowerCase()));
 const graphNodes=[...storyProjects.map(x=>({id:x.id,label:x.title,type:"Project"})),...storyArcs.map(x=>({id:x.id,label:x.title,type:"Arc"})),...storyScenes.map(x=>({id:x.id,label:x.title,type:"Scene"})),...databaseRecords.slice(0,80).map(x=>({id:x.id,label:x.name,type:"Lore"}))];
 return <main className="dashboard-shell production-v9-page"><header className="studio-header"><button className="brand-button" onClick={()=>setPage("dashboard")}><div className="brand-moon">☾</div><div className="brand-button-copy"><span className="header-eyebrow">UMBRA CONNECT</span><strong>Umbra Studio</strong></div></button><div className="account-area"><span className="admin-role-pill">V9 MEGA</span><button className="back-button" onClick={()=>setPage("dashboard")}>Dashboard</button></div></header><section className="production-v9-shell"><div className="production-v9-hero"><div><p className="eyebrow">STORY • COLLABORATION • WORLD INTELLIGENCE</p><h1>Story Production Center</h1><p>Plan stories without duplicating your lore. Connect projects, arcs, scenes, plot beats, characters, locations, canon records, reviews, assignments, and collaborator activity.</p></div><button className="secondary-action" onClick={()=>void loadV9Production()}>{productionBusy?"Refreshing...":"Refresh Production"}</button></div>{productionError&&<p className="login-error">{productionError}</p>}
 <div className="v9-metrics"><div><strong>{v9Health?.projects??storyProjects.length}</strong><span>Projects</span></div><div><strong>{v9Health?.scenes??storyScenes.length}</strong><span>Scenes</span></div><div><strong>{v9Health?.open_assignments??0}</strong><span>Open Assignments</span></div><div><strong>{v9Health?.my_unread_notifications??studioNotifications.filter(x=>!x.is_read).length}</strong><span>Unread</span></div><div><strong>{v9Health?.continuity_open??continuityIssues.filter(x=>['open','reviewing'].includes(x.status)).length}</strong><span>Continuity Alerts</span></div></div>
 <nav className="admin-tabs v9-tabs">{(["overview","projects","arcs","scenes","plot","journeys","review","assignments","inbox","graph"] as const).map(t=><button key={t} className={productionTab===t?"active":""} onClick={()=>setProductionTab(t)}>{t}</button>)}</nav>
 {productionTab==="overview"&&<><div className="v9-overview-grid"><section className="admin-panel"><span className="card-label">WHAT CHANGED?</span><h2>Since Your Last Visit</h2><p className="admin-help">Changes are timestamped and attributed to each collaborator's Studio name.</p><div className="admin-feed">{changesSinceVisit.slice(0,12).map(x=><div className="admin-feed-row" key={x.id}><div><strong>{x.entity_label||x.entity_type}</strong><span>{x.action.replace(/_/g," ")}</span></div><small>{x.actor_name} • {new Date(x.created_at).toLocaleString()}</small></div>)}{changesSinceVisit.length===0&&<p className="admin-empty">No collaborator changes since your previous Studio visit.</p>}</div></section><section className="admin-panel"><span className="card-label">PRODUCTION PULSE</span><h2>Work Waiting on the Team</h2><div className="v9-pulse"><p><strong>{reviewComments.filter(x=>x.status==='open').length}</strong> open review comments</p><p><strong>{studioAssignments.filter(x=>!['done','cancelled'].includes(x.status)).length}</strong> active assignments</p><p><strong>{storyBeats.filter(x=>x.status!=='complete').length}</strong> unfinished plot beats</p><p><strong>{storyScenes.filter(x=>x.status==='review').length}</strong> scenes in review</p></div></section></div><section className="admin-panel"><span className="card-label">RECENT STORY WORK</span><h2>Production Activity</h2><div className="v9-card-grid">{storyProjects.slice(0,6).map(p=><article className="v9-story-card" key={p.id}><span>{p.project_type}</span><h3>{p.title}</h3><p>{p.summary||"No summary yet."}</p><small>{p.status.replace(/_/g,' ')} • {p.canon_status.replace(/_/g,' ')}</small></article>)}</div></section></>}
 {productionTab==="projects"&&<><section className="admin-panel"><span className="card-label">SAGAS • BOOKS • SEASONS • STORIES</span><h2>Create Story Project</h2><div className="v9-form-grid"><input placeholder="Project title" value={projectForm.title} onChange={e=>setProjectForm({...projectForm,title:e.target.value})}/><select value={projectForm.projectType} onChange={e=>setProjectForm({...projectForm,projectType:e.target.value})}><option value="story">Story</option><option value="saga">Saga</option><option value="book">Book</option><option value="season">Season</option><option value="volume">Volume</option><option value="campaign">Campaign</option></select><select value={projectForm.status} onChange={e=>setProjectForm({...projectForm,status:e.target.value})}><option value="idea">Idea</option><option value="planning">Planning</option><option value="writing">Writing</option><option value="review">Review</option><option value="complete">Complete</option></select><textarea placeholder="Project summary" value={projectForm.summary} onChange={e=>setProjectForm({...projectForm,summary:e.target.value})}/><button className="primary-action" onClick={()=>void createStoryProject()}>Create Project</button></div></section><section className="admin-panel"><div className="v9-card-grid">{storyProjects.map(p=><article className="v9-story-card" key={p.id}><span>{p.project_type}</span><h3>{p.title}</h3><p>{p.summary||"No summary yet."}</p><select value={p.status} onChange={e=>void updateProductionStatus("studio_story_projects",p.id,e.target.value)}><option value="idea">Idea</option><option value="planning">Planning</option><option value="writing">Writing</option><option value="review">Review</option><option value="complete">Complete</option><option value="archived">Archived</option></select></article>)}</div></section></>}
 {productionTab==="arcs"&&<><section className="admin-panel"><span className="card-label">STORY STRUCTURE</span><h2>Create Arc</h2><div className="v9-form-grid"><select value={arcForm.projectId} onChange={e=>setArcForm({...arcForm,projectId:e.target.value})}><option value="">No project yet</option>{storyProjects.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><input placeholder="Arc title" value={arcForm.title} onChange={e=>setArcForm({...arcForm,title:e.target.value})}/><textarea placeholder="Arc summary" value={arcForm.summary} onChange={e=>setArcForm({...arcForm,summary:e.target.value})}/><button className="primary-action" onClick={()=>void createStoryArc()}>Create Arc</button></div></section><section className="admin-panel"><div className="v9-card-grid">{storyArcs.map(a=><article className="v9-story-card" key={a.id}><span>{projectName(a.project_id)}</span><h3>{a.title}</h3><p>{a.summary||"No summary yet."}</p><select value={a.status} onChange={e=>void updateProductionStatus("studio_story_arcs",a.id,e.target.value)}><option value="idea">Idea</option><option value="planned">Planned</option><option value="writing">Writing</option><option value="review">Review</option><option value="complete">Complete</option></select></article>)}</div></section></>}
 {productionTab==="scenes"&&<><section className="admin-panel"><span className="card-label">SCENE MANAGER</span><h2>Create Scene</h2><div className="v9-form-grid"><select value={sceneForm.projectId} onChange={e=>setSceneForm({...sceneForm,projectId:e.target.value,arcId:""})}><option value="">No project</option>{storyProjects.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><select value={sceneForm.arcId} onChange={e=>setSceneForm({...sceneForm,arcId:e.target.value})}><option value="">No arc</option>{storyArcs.filter(x=>!sceneForm.projectId||x.project_id===sceneForm.projectId).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><input placeholder="Scene title" value={sceneForm.title} onChange={e=>setSceneForm({...sceneForm,title:e.target.value})}/><select value={sceneForm.povId} onChange={e=>setSceneForm({...sceneForm,povId:e.target.value})}><option value="">No POV character</option>{studioCharacters.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={sceneForm.locationId} onChange={e=>setSceneForm({...sceneForm,locationId:e.target.value})}><option value="">No location</option>{worldLocations.filter(x=>!x.archived_at).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input placeholder="Era" value={sceneForm.era} onChange={e=>setSceneForm({...sceneForm,era:e.target.value})}/><input placeholder="Story date / approximate date" value={sceneForm.storyDate} onChange={e=>setSceneForm({...sceneForm,storyDate:e.target.value})}/><textarea placeholder="Scene summary" value={sceneForm.summary} onChange={e=>setSceneForm({...sceneForm,summary:e.target.value})}/><button className="primary-action" onClick={()=>void createStoryScene()}>Create Scene</button></div></section><section className="admin-panel"><div className="database-toolbar"><input type="search" value={productionSearch} onChange={e=>setProductionSearch(e.target.value)} placeholder="Search scenes, projects, arcs, eras..."/></div><div className="v9-scene-list">{filteredScenes.map(s=><article key={s.id}><div><span>{projectName(s.project_id)} → {arcName(s.arc_id)}</span><h3>{s.title}</h3><p>{s.summary||"No summary yet."}</p><small>{s.era||"Era unset"}{s.story_date?` • ${s.story_date}`:""} • POV: {studioCharacters.find(x=>x.id===s.pov_character_id)?.name||"Unset"}</small></div><select value={s.status} onChange={e=>void updateProductionStatus("studio_story_scenes",s.id,e.target.value)}><option value="idea">Idea</option><option value="planned">Planned</option><option value="writing">Writing</option><option value="review">Review</option><option value="complete">Complete</option></select></article>)}</div></section></>}
 {productionTab==="plot"&&<><section className="admin-panel"><span className="card-label">PLOT BOARD</span><h2>Add Story Beat</h2><div className="v9-form-grid"><select value={beatForm.projectId} onChange={e=>setBeatForm({...beatForm,projectId:e.target.value})}><option value="">No project</option>{storyProjects.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><select value={beatForm.arcId} onChange={e=>setBeatForm({...beatForm,arcId:e.target.value})}><option value="">No arc</option>{storyArcs.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><select value={beatForm.sceneId} onChange={e=>setBeatForm({...beatForm,sceneId:e.target.value})}><option value="">No scene</option>{storyScenes.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><input placeholder="Beat title" value={beatForm.title} onChange={e=>setBeatForm({...beatForm,title:e.target.value})}/><select value={beatForm.beatType} onChange={e=>setBeatForm({...beatForm,beatType:e.target.value})}><option value="plot">Plot</option><option value="character">Character</option><option value="reveal">Reveal</option><option value="conflict">Conflict</option><option value="setup">Setup</option><option value="payoff">Payoff</option></select><textarea placeholder="What happens?" value={beatForm.description} onChange={e=>setBeatForm({...beatForm,description:e.target.value})}/><button className="primary-action" onClick={()=>void createStoryBeat()}>Add Beat</button></div></section><section className="v9-kanban">{["idea","planned","writing","review","complete"].map(status=><div className="v9-kanban-column" key={status}><h3>{status.replace(/_/g,' ')}</h3>{storyBeats.filter(x=>x.status===status).map(b=><article key={b.id}><span>{b.beat_type}</span><strong>{b.title}</strong><p>{b.description||""}</p><select value={b.status} onChange={e=>void updateProductionStatus("studio_story_beats",b.id,e.target.value)}>{["idea","planned","writing","review","complete"].map(s=><option key={s} value={s}>{s}</option>)}</select></article>)}</div>)}</section></>}
 {productionTab==="journeys"&&<><section className="admin-panel"><span className="card-label">CHARACTER JOURNEY TRACKER</span><h2>Record Character Change</h2><div className="v9-form-grid"><select value={journeyForm.characterId} onChange={e=>setJourneyForm({...journeyForm,characterId:e.target.value})}><option value="">Choose character</option>{studioCharacters.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={journeyForm.journeyType} onChange={e=>setJourneyForm({...journeyForm,journeyType:e.target.value})}><option value="development">Development</option><option value="goal">Goal</option><option value="injury">Injury</option><option value="transformation">Transformation</option><option value="title">Title / Rank</option><option value="allegiance">Allegiance</option><option value="relationship">Relationship</option><option value="power">Power</option></select><select value={journeyForm.projectId} onChange={e=>setJourneyForm({...journeyForm,projectId:e.target.value})}><option value="">No project</option>{storyProjects.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><select value={journeyForm.sceneId} onChange={e=>setJourneyForm({...journeyForm,sceneId:e.target.value})}><option value="">No scene</option>{storyScenes.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><input placeholder="Change title" value={journeyForm.title} onChange={e=>setJourneyForm({...journeyForm,title:e.target.value})}/><input placeholder="Before" value={journeyForm.beforeValue} onChange={e=>setJourneyForm({...journeyForm,beforeValue:e.target.value})}/><input placeholder="After" value={journeyForm.afterValue} onChange={e=>setJourneyForm({...journeyForm,afterValue:e.target.value})}/><textarea placeholder="Notes" value={journeyForm.description} onChange={e=>setJourneyForm({...journeyForm,description:e.target.value})}/><button className="primary-action" onClick={()=>void createJourneyEvent()}>Add Journey Event</button></div></section><section className="admin-panel"><div className="v9-journey-list">{characterJourney.map(j=><article key={j.id}><span>{j.journey_type}</span><h3>{studioCharacters.find(x=>x.id===j.character_id)?.name||"Character"} — {j.title}</h3>{(j.before_value||j.after_value)&&<p><strong>{j.before_value||"—"}</strong> → <strong>{j.after_value||"—"}</strong></p>}<small>{j.description||""}</small></article>)}</div></section></>}
 {productionTab==="review"&&<><section className="admin-panel"><span className="card-label">COMMENTS & REVIEW THREADS</span><h2>Start Review Comment</h2><div className="v9-form-grid"><select value={commentForm.entityType} onChange={e=>setCommentForm({...commentForm,entityType:e.target.value,entityId:""})}><option value="story_project">Project</option><option value="story_arc">Arc</option><option value="story_scene">Scene</option><option value="database">World Database</option><option value="character">Character</option><option value="codex">Codex</option><option value="location">Location</option><option value="timeline">Timeline</option></select><select value={commentForm.entityId} onChange={e=>setCommentForm({...commentForm,entityId:e.target.value})}><option value="">Choose record</option>{productionEntityOptions(commentForm.entityType).map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><select value={commentForm.notifyUserId} onChange={e=>setCommentForm({...commentForm,notifyUserId:e.target.value})}><option value="">No notification</option>{adminMembers.filter(x=>x.user_id!==session.user.id).map(x=><option key={x.user_id} value={x.user_id}>Notify {x.display_name||x.email}</option>)}</select><textarea placeholder="Review comment..." value={commentForm.body} onChange={e=>setCommentForm({...commentForm,body:e.target.value})}/><button className="primary-action" onClick={()=>void addReviewCommentV9()}>Post Comment</button></div></section><section className="admin-panel"><div className="v9-review-list">{reviewComments.map(c=><article className={c.status==='resolved'?"resolved":""} key={c.id}><div><strong>{c.created_by_name||personName(c.created_by)}</strong><span>{c.entity_type} • {new Date(c.created_at).toLocaleString()}</span></div><p>{c.body}</p>{c.status==='open'?<button onClick={()=>void resolveReviewComment(c.id)}>Resolve</button>:<small>Resolved</small>}</article>)}</div></section></>}
 {productionTab==="assignments"&&<><section className="admin-panel"><span className="card-label">TEAM WORK QUEUE</span><h2>Create Assignment</h2><div className="v9-form-grid"><input placeholder="Assignment title" value={assignmentForm.title} onChange={e=>setAssignmentForm({...assignmentForm,title:e.target.value})}/><select value={assignmentForm.assignedTo} onChange={e=>setAssignmentForm({...assignmentForm,assignedTo:e.target.value})}><option value="">Assign to...</option>{adminMembers.map(x=><option key={x.user_id} value={x.user_id}>{x.display_name||x.email}</option>)}</select><select value={assignmentForm.priority} onChange={e=>setAssignmentForm({...assignmentForm,priority:e.target.value})}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><input type="datetime-local" value={assignmentForm.dueAt} onChange={e=>setAssignmentForm({...assignmentForm,dueAt:e.target.value})}/><textarea placeholder="Instructions" value={assignmentForm.description} onChange={e=>setAssignmentForm({...assignmentForm,description:e.target.value})}/><button className="primary-action" onClick={()=>void createAssignmentV9()}>Assign Work</button></div></section><section className="admin-panel"><div className="v9-assignment-list">{studioAssignments.map(a=><article key={a.id}><div><span className={`v9-priority ${a.priority}`}>{a.priority}</span><h3>{a.title}</h3><p>{a.description||""}</p><small>{personName(a.assigned_to)}{a.due_at?` • Due ${new Date(a.due_at).toLocaleString()}`:""}</small></div><select value={a.status} onChange={e=>void updateProductionStatus("studio_assignments",a.id,e.target.value)}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select></article>)}</div></section></>}
 {productionTab==="inbox"&&<section className="admin-panel"><span className="card-label">STUDIO NOTIFICATIONS</span><h2>Inbox</h2><div className="v9-inbox">{studioNotifications.map(n=><article className={n.is_read?"read":"unread"} key={n.id}><div><strong>{n.title}</strong><span>{n.actor_name||"Umbra Studio"} • {new Date(n.created_at).toLocaleString()}</span></div><p>{n.message||""}</p>{!n.is_read&&<button onClick={()=>void markNotificationRead(n.id)}>Mark Read</button>}</article>)}{studioNotifications.length===0&&<p className="admin-empty">Your Studio inbox is clear.</p>}</div></section>}
 {productionTab==="graph"&&<section className="admin-panel"><span className="card-label">WORLD INTELLIGENCE</span><h2>Relationship & Dependency Graph</h2><p className="admin-help">A lightweight graph index of story structure and existing lore. Universal links and story links remain the source of truth; this view never changes canon automatically.</p><div className="v9-graph"><div className="v9-graph-nodes">{graphNodes.slice(0,160).map(n=><article key={`${n.type}:${n.id}`}><span>{n.type}</span><strong>{n.label}</strong><small>{universalLinks.filter(l=>l.source_id===n.id||l.target_id===n.id).length+storyLinks.filter(l=>l.story_entity_id===n.id||l.linked_entity_id===n.id).length} connections</small></article>)}</div></div></section>}
 </section></main>;
}

if(page==="database"){
 const activeRecords=databaseRecords.filter(r=>!r.archived_at); const archivedRecords=databaseRecords.filter(r=>r.archived_at); const filtered=activeRecords.filter(r=>(databaseTypeFilter==="all"||r.record_type_id===databaseTypeFilter)&&[r.record_code,r.name,r.subtitle,r.summary].filter(Boolean).join(" ").toLowerCase().includes(databaseSearch.toLowerCase()));
 const selectedRecord=databaseRecords.find(r=>r.id===selectedDatabaseRecordId)||null;
 const recordCollections=selectedRecord?collectionItems.filter(x=>x.entity_type==="database"&&x.entity_id===selectedRecord.id):[];
 const recordTags=selectedRecord?tagAssignments.filter(x=>x.entity_type==="database"&&x.entity_id===selectedRecord.id):[];
 const entityOptions=(kind:string)=>kind==="database"?databaseRecords.map(x=>({id:x.id,label:`${x.record_code} • ${x.name}`})):kind==="character"?studioCharacters.map(x=>({id:x.id,label:x.name})):kind==="codex"?worldRecords.map(x=>({id:x.id,label:x.name})):kind==="location"?worldLocations.map(x=>({id:x.id,label:x.name})):timelineEvents.map(x=>({id:x.id,label:x.title}));
 return <main className="dashboard-shell database-v4-page"><header className="studio-header"><button className="brand-button" onClick={()=>setPage("dashboard")}><div className="brand-moon">☾</div><div className="brand-button-copy"><span className="header-eyebrow">UMBRA CONNECT</span><strong>Umbra Studio</strong></div></button><div className="account-area"><span className="admin-role-pill">{studioAccessRole}</span><button className="back-button" onClick={()=>setPage("dashboard")}>Dashboard</button></div></header><section className="database-v4-shell"><div className="database-v4-hero"><div><p className="eyebrow">CANON • CONTINUITY • ENCYCLOPEDIA • V8 MEGA</p><h1>World Database</h1><p>Control canon, continuity, publishing, dependencies, lore, revisions, collaboration, imports, references, media, and recovery from one worldbuilding operations system.</p></div><button className="secondary-action" onClick={()=>void loadWorldDatabase()}>{databaseBusy?"Refreshing...":"Refresh"}</button></div>{databaseError&&<p className="login-error">{databaseError}</p>}<div className="database-v4-metrics"><div><strong>{activeRecords.length}</strong><span>Active Records</span></div><div><strong>{selectedDatabaseRecordIds.size}</strong><span>Selected</span></div><div><strong>{universalLinks.length}</strong><span>Links</span></div><div><strong>{mediaAssets.length}</strong><span>Media</span></div><div><strong>{archivedRecords.length}</strong><span>Archived</span></div></div><nav className="admin-tabs database-tabs">{(["records","canon","continuity","encyclopedia","collections","tags","links","media","bulk","health","revisions","duplicates","templates","import","backup"] as const).map(t=><button key={t} className={databaseTab===t?"active":""} onClick={()=>setDatabaseTab(t)}>{t}</button>)}</nav>
 {databaseTab==="records"&&<><section className="admin-panel"><div className="admin-panel-heading"><div><span className="card-label">NEW DATABASE ENTRY</span><h2>Create Expanded Record</h2></div><small>Permanent ID assigned automatically</small></div><div className="database-form-grid"><select value={recordForm.typeId} onChange={e=>setRecordForm({...recordForm,typeId:e.target.value})}>{recordTypes.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select><input placeholder="Record name" value={recordForm.name} onChange={e=>setRecordForm({...recordForm,name:e.target.value})}/><input placeholder="Subtitle / classification" value={recordForm.subtitle} onChange={e=>setRecordForm({...recordForm,subtitle:e.target.value})}/><textarea placeholder="Short summary" value={recordForm.summary} onChange={e=>setRecordForm({...recordForm,summary:e.target.value})}/><button className="primary-action" onClick={()=>void createDatabaseRecord()}>Create Record</button></div></section><section className="admin-panel"><div className="database-toolbar"><input type="search" placeholder="Search ID, name, classification, summary..." value={databaseSearch} onChange={e=>setDatabaseSearch(e.target.value)}/><select value={databaseTypeFilter} onChange={e=>setDatabaseTypeFilter(e.target.value)}><option value="all">All record types</option>{recordTypes.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></div><div className="database-record-grid">{filtered.map(r=>{const type=recordTypes.find(t=>t.id===r.record_type_id);const complete=recordCompleteness(r);return <article className={`database-record-card ${selectedDatabaseRecordIds.has(r.id)?"selected":""}`} key={r.id}><div className="database-record-top"><label className="record-check"><input type="checkbox" checked={selectedDatabaseRecordIds.has(r.id)} onChange={()=>toggleDatabaseSelection(r.id)}/><span>{r.record_code}</span></label><small>{type?.name||"Record"}</small></div><h3>{r.name}</h3>{r.subtitle&&<strong>{r.subtitle}</strong>}<p>{r.summary||"No summary yet."}</p><div className="completeness-line"><span style={{width:`${complete}%`}}/></div><small>{complete}% complete • {r.workflow_status.replace(/_/g," ")} • {(r.canon_status||"concept").replace(/_/g," ")}</small><div className="record-card-actions"><button onClick={()=>void openDatabaseRecord(r)}>Open Record</button><button onClick={()=>void archiveDatabaseRecord(r.id)}>Archive</button></div></article>})}</div></section>{adminRole==="primary_admin"&&<section className="admin-panel"><span className="card-label">PRIMARY ADMIN</span><h2>Custom Record Types</h2><p className="admin-help">Create future categories without another database migration.</p><div className="database-form-grid"><input placeholder="Type name — e.g. Festivals" value={customTypeForm.name} onChange={e=>setCustomTypeForm({...customTypeForm,name:e.target.value,slug:e.target.value})}/><input placeholder="Slug" value={customTypeForm.slug} onChange={e=>setCustomTypeForm({...customTypeForm,slug:e.target.value})}/><input placeholder="Description" value={customTypeForm.description} onChange={e=>setCustomTypeForm({...customTypeForm,description:e.target.value})}/><button className="secondary-action" onClick={()=>void createCustomType()}>Add Record Type</button></div></section>}</>}
 {selectedRecord&&databaseTab==="records"&&<div className="record-editor-overlay" onClick={()=>void closeDatabaseRecord()}><section className="record-editor-panel record-editor-v7" onClick={e=>e.stopPropagation()}><div className="record-editor-head"><div><span className="card-label">{selectedRecord.record_code} • LORE WORKSPACE V7</span><h2>{selectedRecord.name}</h2><small>{autosaveStatus||"Local recovery draft available on demand"}</small></div><button onClick={()=>void closeDatabaseRecord()}>×</button></div><div className="record-editor-grid"><label>Name<input value={recordEditor.name} onChange={e=>setRecordEditor({...recordEditor,name:e.target.value})}/></label><label>Subtitle / Classification<input value={recordEditor.subtitle} onChange={e=>setRecordEditor({...recordEditor,subtitle:e.target.value})}/></label><label className="wide">Summary<textarea value={recordEditor.summary} onChange={e=>setRecordEditor({...recordEditor,summary:e.target.value})}/></label><label>Hero Image URL<input value={recordEditor.imageUrl} onChange={e=>setRecordEditor({...recordEditor,imageUrl:e.target.value})}/></label><label>Workflow<select value={recordEditor.workflowStatus} onChange={e=>setRecordEditor({...recordEditor,workflowStatus:e.target.value})}><option value="draft">Draft</option><option value="in_review">In Review</option><option value="approved">Approved</option><option value="published">Published</option></select></label><label>Canon Status<select value={selectedRecord.canon_status||"concept"} onChange={e=>void changeCanonStatus(selectedRecord.id,e.target.value)}><option value="concept">Concept</option><option value="draft_canon">Draft Canon</option><option value="canon">Canon</option><option value="retconned">Retconned</option><option value="deprecated">Deprecated</option></select></label><label className="wide">Canon Change Reason<input value={canonReason} onChange={e=>setCanonReason(e.target.value)} placeholder="Why is canon status changing? Saved to retcon history."/></label><label className="v8-public-toggle"><input type="checkbox" checked={!!selectedRecord.is_public} onChange={e=>void toggleRecordPublic(selectedRecord.id,e.target.checked)}/> Include in public encyclopedia</label></div><div className="v7-editor-switch"><button className={recordEditorMode==="visual"?"active":""} onClick={()=>{try{const d=JSON.parse(recordEditor.detailsText||"{}");setRecordVisualDetails(Object.entries(d).map(([key,value])=>({key,value:typeof value==="string"?value:JSON.stringify(value,null,2)})));}catch{}setRecordEditorMode("visual")}}>Visual Lore Fields</button><button className={recordEditorMode==="json"?"active":""} onClick={()=>setRecordEditorMode("json")}>Advanced JSON</button><button onClick={saveLocalRecoveryDraft}>Save Recovery Draft</button></div>{recordEditorMode==="visual"?<section className="v7-lore-builder"><div className="v7-section-heading"><div><span className="card-label">STRUCTURED LORE</span><h3>Record Details</h3></div><small>Add any fields this record needs. Templates can create a starting structure.</small></div>{recordVisualDetails.length===0&&<p className="admin-empty">No structured lore fields yet. Apply a template below or add your first field.</p>}<div className="v7-field-list">{recordVisualDetails.map((field,index)=><article key={`${field.key}-${index}`}><div><input value={field.key} onChange={e=>{const next=[...recordVisualDetails];next[index]={...next[index],key:e.target.value};syncVisualDetails(next)}} placeholder="Field name"/><button onClick={()=>removeVisualDetail(index)}>Remove</button></div><textarea value={field.value} onChange={e=>{const next=[...recordVisualDetails];next[index]={...next[index],value:e.target.value};syncVisualDetails(next)}} placeholder={`Write ${field.key||"lore"} here...`}/></article>)}</div><div className="v7-add-field"><input placeholder="New field — e.g. History" value={newDetailField.key} onChange={e=>setNewDetailField({...newDetailField,key:e.target.value})}/><input placeholder="Optional starting text" value={newDetailField.value} onChange={e=>setNewDetailField({...newDetailField,value:e.target.value})}/><button onClick={addVisualDetail}>Add Lore Field</button></div></section>:<label className="v7-json-block">Structured Details (JSON)<textarea className="json-editor" value={recordEditor.detailsText} onChange={e=>setRecordEditor({...recordEditor,detailsText:e.target.value})}/></label>}<div className="record-editor-grid v7-notes"><label className="wide">Private Working Notes<textarea value={recordEditor.notes} onChange={e=>setRecordEditor({...recordEditor,notes:e.target.value})}/></label></div><div className="record-assignment-grid"><div><h3>Collections</h3><div className="assignment-form"><select value={assignmentCollectionId} onChange={e=>setAssignmentCollectionId(e.target.value)}><option value="">Choose collection</option>{collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={()=>void assignCollection(selectedRecord.id)}>Add</button></div><div className="assignment-chips">{recordCollections.map(a=><button key={a.id} onClick={()=>void removeCollectionAssignment(a.id)}>{collections.find(c=>c.id===a.collection_id)?.name||"Collection"} ×</button>)}</div></div><div><h3>Tags</h3><div className="assignment-form"><select value={assignmentTagId} onChange={e=>setAssignmentTagId(e.target.value)}><option value="">Choose tag</option>{studioTags.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button onClick={()=>void assignTag(selectedRecord.id)}>Add</button></div><div className="assignment-chips">{recordTags.map(a=><button key={a.id} onClick={()=>void removeTagAssignment(a.id)}>{studioTags.find(t=>t.id===a.tag_id)?.name||"Tag"} ×</button>)}</div></div></div><div className="record-v6-tools"><div><h3>Field Templates</h3><div className="assignment-chips">{fieldTemplates.filter(t=>t.record_type_id===selectedRecord.record_type_id).map(t=><button key={t.id} onClick={()=>applyTemplate(t)}>{t.name}</button>)}</div></div><div><h3>Attached Media</h3><div className="assignment-form"><select value={recordMediaId} onChange={e=>setRecordMediaId(e.target.value)}><option value="">Choose media asset</option>{mediaAssets.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select><button onClick={()=>void attachMediaToRecord(selectedRecord.id)}>Attach</button></div><div className="assignment-chips">{mediaAttachments.filter(a=>a.entity_type==="database"&&a.entity_id===selectedRecord.id).map(a=><button key={a.id} onClick={()=>void detachMedia(a.id)}>{mediaAssets.find(m=>m.id===a.media_id)?.title||"Media"} ×</button>)}</div></div></div><section className="v7-reference-panel"><div className="v7-section-heading"><div><span className="card-label">SOURCES & REFERENCES</span><h3>Reference Shelf</h3></div><small>Keep research, inspiration, internal notes, and source links separate from canon lore.</small></div><div className="v7-reference-form"><input placeholder="Reference label" value={referenceForm.label} onChange={e=>setReferenceForm({...referenceForm,label:e.target.value})}/><select value={referenceForm.referenceType} onChange={e=>setReferenceForm({...referenceForm,referenceType:e.target.value})}><option value="source">Source</option><option value="art_reference">Art Reference</option><option value="research">Research</option><option value="internal">Internal Note</option><option value="inspiration">Inspiration</option></select><input placeholder="URL (optional)" value={referenceForm.url} onChange={e=>setReferenceForm({...referenceForm,url:e.target.value})}/><input placeholder="Citation / creator / book (optional)" value={referenceForm.citation} onChange={e=>setReferenceForm({...referenceForm,citation:e.target.value})}/><textarea placeholder="Reference notes" value={referenceForm.notes} onChange={e=>setReferenceForm({...referenceForm,notes:e.target.value})}/><button onClick={()=>void addRecordReference(selectedRecord.id)}>Add Reference</button></div><div className="v7-reference-list">{recordReferences.filter(r=>r.record_id===selectedRecord.id).map(ref=><article key={ref.id}><div><strong>{ref.label}</strong><span>{ref.reference_type.replace(/_/g," ")}{ref.citation?` • ${ref.citation}`:""}</span>{ref.notes&&<p>{ref.notes}</p>}{ref.url&&<small>{ref.url}</small>}</div><button onClick={()=>void deleteRecordReference(ref.id)}>Remove</button></article>)}</div></section><div className="record-editor-actions"><button className="secondary-action" onClick={saveLocalRecoveryDraft}>Save Recovery Draft</button><button className="secondary-action" onClick={()=>void closeDatabaseRecord()}>Close Without Saving</button><button className="primary-action" onClick={()=>void saveDatabaseRecord()}>Save Record</button></div></section></div>}
 {databaseTab==="canon"&&<><section className="admin-panel"><div className="admin-panel-heading"><div><span className="card-label">CANON CONTROL</span><h2>Canon Registry</h2></div><small>Editorial workflow and canon are intentionally separate.</small></div><div className="database-toolbar"><input type="search" placeholder="Search canon registry..." value={canonSearch} onChange={e=>setCanonSearch(e.target.value)}/><select value={canonFilter} onChange={e=>setCanonFilter(e.target.value)}><option value="all">All canon states</option><option value="concept">Concept</option><option value="draft_canon">Draft Canon</option><option value="canon">Canon</option><option value="retconned">Retconned</option><option value="deprecated">Deprecated</option></select></div><div className="v8-canon-grid">{databaseRecords.filter(r=>!r.archived_at&&(canonFilter==="all"||(r.canon_status||"concept")===canonFilter)&&[r.record_code,r.name,r.summary].filter(Boolean).join(" ").toLowerCase().includes(canonSearch.toLowerCase())).map(r=><article key={r.id}><div><span className={`canon-badge canon-${r.canon_status||"concept"}`}>{(r.canon_status||"concept").replace(/_/g," ")}</span><small>{r.record_code}</small></div><h3>{r.name}</h3><p>{r.summary||"No summary yet."}</p><div className="record-card-actions"><button onClick={()=>void openDatabaseRecord(r)}>Open</button><button onClick={()=>{setCanonReason(prompt("Reason for canon change (optional)")||"");void changeCanonStatus(r.id,"canon")}}>Mark Canon</button></div></article>)}</div></section><section className="admin-panel"><span className="card-label">RETCON LEDGER</span><h2>Canon Decision History</h2><div className="admin-feed">{canonHistory.map(h=><div className="admin-feed-row" key={h.id}><div><strong>{h.entity_label||h.entity_type}</strong><span>{h.previous_status||"new"} → {h.new_status}{h.reason?` • ${h.reason}`:""}</span></div><small>{h.changed_by_name||"Studio Member"} • {new Date(h.created_at).toLocaleString()}</small></div>)}</div></section></>}
{databaseTab==="continuity"&&<section className="admin-panel"><div className="admin-panel-heading"><div><span className="card-label">CONTINUITY CHECKER</span><h2>World Integrity Review</h2></div><button className="primary-action" onClick={()=>void runContinuityScan()}>{databaseBusy?"Scanning...":"Run Continuity Scan"}</button></div><p className="admin-help">Studio only flags possible problems. It never rewrites or silently fixes your canon.</p><div className="v8-issue-list">{continuityIssues.filter(i=>i.status!=="resolved").map(i=><article className={`v8-issue issue-${i.severity}`} key={i.id}><div><span>{i.severity}</span><strong>{i.entity_label||i.entity_type}</strong><p>{i.message}</p><small>{i.issue_type.replace(/_/g," ")} • {new Date(i.created_at).toLocaleString()}</small></div><div><button onClick={()=>void setContinuityStatus(i.id,"reviewing")}>Reviewing</button><button onClick={()=>void setContinuityStatus(i.id,"resolved")}>Resolve</button><button onClick={()=>void setContinuityStatus(i.id,"ignored")}>Ignore</button></div></article>)}</div></section>}
{databaseTab==="encyclopedia"&&<><section className="admin-panel"><span className="card-label">PUBLICATION CONTROL</span><h2>Umbra Encyclopedia</h2><p className="admin-help">Only records that are Published, Draft Canon/Canon, and explicitly Public are readable through the public database policy.</p>{publicSettings&&<div className="database-form-grid"><input value={publicSettings.title} onChange={e=>setPublicSettings({...publicSettings,title:e.target.value})} placeholder="Encyclopedia title"/><input value={publicSettings.subtitle||""} onChange={e=>setPublicSettings({...publicSettings,subtitle:e.target.value})} placeholder="Subtitle"/><textarea value={publicSettings.introduction||""} onChange={e=>setPublicSettings({...publicSettings,introduction:e.target.value})} placeholder="Public introduction"/><input value={publicSettings.hero_image_url||""} onChange={e=>setPublicSettings({...publicSettings,hero_image_url:e.target.value})} placeholder="Hero image URL"/><label className="v8-public-toggle"><input type="checkbox" checked={publicSettings.is_enabled} onChange={e=>setPublicSettings({...publicSettings,is_enabled:e.target.checked})}/> Enable encyclopedia settings publicly</label><button className="primary-action" onClick={()=>void savePublicSettings()}>Save Encyclopedia Settings</button></div>}</section><section className="admin-panel"><span className="card-label">PUBLIC PREVIEW</span><h2>{publicSettings?.title||"The Umbral World"}</h2><div className="v8-encyclopedia-grid">{databaseRecords.filter(r=>r.is_public&&r.workflow_status==="published"&&['draft_canon','canon'].includes(r.canon_status||'concept')&&!r.archived_at).map(r=><article key={r.id}>{r.image_url&&<img src={r.image_url} alt=""/>}<span>{recordTypes.find(t=>t.id===r.record_type_id)?.name||"Lore"}</span><h3>{r.name}</h3><p>{r.summary||""}</p><small>{r.record_code} • {(r.canon_status||"").replace(/_/g," ")}</small></article>)}</div></section></>}
{databaseTab==="collections"&&<section className="admin-panel"><span className="card-label">DATABASE COLLECTIONS</span><h2>Collection Manager</h2><div className="database-form-grid"><input placeholder="Collection name" value={collectionForm.name} onChange={e=>setCollectionForm({...collectionForm,name:e.target.value})}/><input placeholder="Description" value={collectionForm.description} onChange={e=>setCollectionForm({...collectionForm,description:e.target.value})}/><button className="primary-action" onClick={()=>void createCollection()}>Create Collection</button></div><div className="database-simple-grid">{collections.map(c=>{const count=collectionItems.filter(x=>x.collection_id===c.id).length;return <article key={c.id}><strong>{c.name}</strong><p>{c.description||"No description yet."}</p><small>{count} assigned record{count===1?"":"s"}</small></article>})}</div></section>}
 {databaseTab==="tags"&&<section className="admin-panel"><span className="card-label">CONTROLLED VOCABULARY</span><h2>Tag Manager</h2><div className="database-inline-form"><input placeholder="New reusable tag" value={tagName} onChange={e=>setTagName(e.target.value)}/><button className="primary-action" onClick={()=>void createTag()}>Add Tag</button></div><div className="database-tag-cloud">{studioTags.map(t=><span key={t.id}>{t.name} <small>{tagAssignments.filter(x=>x.tag_id===t.id).length}</small></span>)}</div></section>}
 {databaseTab==="links"&&<section className="admin-panel"><span className="card-label">UNIVERSAL RELATIONSHIP ENGINE</span><h2>Cross-Record Link Manager</h2><p className="admin-help">Connect expanded records to other records, characters, Codex entries, locations, and timeline events.</p><div className="link-builder"><select value={linkForm.sourceId} onChange={e=>setLinkForm({...linkForm,sourceId:e.target.value})}><option value="">Source database record</option>{databaseRecords.filter(x=>!x.archived_at).map(x=><option key={x.id} value={x.id}>{x.record_code} • {x.name}</option>)}</select><select value={linkForm.targetType} onChange={e=>setLinkForm({...linkForm,targetType:e.target.value,targetId:""})}><option value="database">Database Record</option><option value="character">Character</option><option value="codex">Codex</option><option value="location">Location</option><option value="timeline">Timeline Event</option></select><select value={linkForm.targetId} onChange={e=>setLinkForm({...linkForm,targetId:e.target.value})}><option value="">Target</option>{entityOptions(linkForm.targetType).map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><input placeholder="Relationship — e.g. Owned By" value={linkForm.label} onChange={e=>setLinkForm({...linkForm,label:e.target.value})}/><input placeholder="Optional notes" value={linkForm.notes} onChange={e=>setLinkForm({...linkForm,notes:e.target.value})}/><button className="primary-action" onClick={()=>void createUniversalLink()}>Create Link</button></div><div className="admin-feed">{universalLinks.map(l=><div className="admin-feed-row" key={l.id}><div><strong>{l.relation_label}</strong><span>{l.source_type}:{l.source_id.slice(0,8)} → {l.target_type}:{l.target_id.slice(0,8)}</span></div><button onClick={()=>void deleteUniversalLink(l.id)}>Remove</button></div>)}</div></section>}
 {databaseTab==="media"&&<section className="admin-panel"><span className="card-label">MEDIA CATALOG</span><h2>Studio Media Manager</h2><div className="database-form-grid"><input placeholder="Asset title" value={mediaForm.title} onChange={e=>setMediaForm({...mediaForm,title:e.target.value})}/><input placeholder="Image / asset URL" value={mediaForm.assetUrl} onChange={e=>setMediaForm({...mediaForm,assetUrl:e.target.value})}/><select value={mediaForm.mediaType} onChange={e=>setMediaForm({...mediaForm,mediaType:e.target.value})}><option value="image">Image</option><option value="map">Map</option><option value="reference">Reference</option><option value="document">Document</option><option value="other">Other</option></select><input placeholder="Caption" value={mediaForm.caption} onChange={e=>setMediaForm({...mediaForm,caption:e.target.value})}/><input placeholder="Credit" value={mediaForm.credit} onChange={e=>setMediaForm({...mediaForm,credit:e.target.value})}/><input placeholder="Alt text" value={mediaForm.altText} onChange={e=>setMediaForm({...mediaForm,altText:e.target.value})}/><input placeholder="Tags, comma separated" value={mediaForm.tags} onChange={e=>setMediaForm({...mediaForm,tags:e.target.value})}/><button className="primary-action" onClick={()=>void createMediaAsset()}>Catalog Asset</button></div><div className="database-simple-grid media-manager-grid">{mediaAssets.filter(m=>!(m as any).archived_at).map(m=><article key={m.id}>{m.asset_url&&m.media_type!=="document"&&<img src={m.asset_url} alt={m.alt_text||m.title}/>}<strong>{m.title}</strong><p>{m.caption||m.credit||m.media_type}</p>{m.tags?.length>0&&<small>{m.tags.join(" • ")}</small>}</article>)}</div></section>}
 {databaseTab==="bulk"&&<section className="admin-panel"><span className="card-label">BULK DATABASE MANAGER</span><h2>{selectedDatabaseRecordIds.size} Records Selected</h2><p className="admin-help">Select records from the Records tab, then manage them together here.</p><div className="bulk-actions"><button onClick={()=>void bulkWorkflow("draft")}>Mark Draft</button><button onClick={()=>void bulkWorkflow("in_review")}>Send to Review</button><button onClick={()=>void bulkWorkflow("approved")}>Approve</button><button onClick={()=>void bulkWorkflow("published")}>Mark Published</button><button onClick={exportSelectedCsv}>Export Selected CSV</button><button className="danger-action" onClick={()=>void bulkArchive()}>Archive Selected</button></div></section>}
 {databaseTab==="health"&&<section className="admin-panel"><span className="card-label">DATABASE HEALTH CENTER</span><h2>Structure & Completeness</h2><div className="health-grid"><div><strong>{databaseHealth?.active_records??activeRecords.length}</strong><span>Active</span></div><div><strong>{databaseHealth?.draft_records??0}</strong><span>Drafts</span></div><div><strong>{databaseHealth?.review_records??0}</strong><span>In Review</span></div><div><strong>{databaseHealth?.records_without_summary??0}</strong><span>Missing Summary</span></div><div><strong>{databaseHealth?.records_without_image??0}</strong><span>Missing Image</span></div><div><strong>{databaseHealth?.links??universalLinks.length}</strong><span>Universal Links</span></div></div><div className="health-list">{activeRecords.filter(r=>recordCompleteness(r)<100).sort((a,b)=>recordCompleteness(a)-recordCompleteness(b)).map(r=><button key={r.id} onClick={()=>{setDatabaseTab("records");openDatabaseRecord(r)}}><span>{r.record_code} • {r.name}</span><strong>{recordCompleteness(r)}%</strong></button>)}</div></section>}
 {databaseTab==="revisions"&&<section className="admin-panel"><span className="card-label">VERSION HISTORY</span><h2>Database Record Revisions</h2><p className="admin-help">Every record update is captured automatically. Restore an older version without losing the current one.</p><div className="revision-list">{databaseRevisions.map(r=><article key={r.id}><div><strong>{r.record_code||"Record"} • {r.record_name||"Untitled"}</strong><span>{r.changed_by_email||"Studio admin"} • {new Date(r.created_at).toLocaleString()}</span></div><button onClick={()=>void restoreDatabaseRevision(r)}>Restore</button></article>)}</div></section>}
{databaseTab==="duplicates"&&<section className="admin-panel"><span className="card-label">DATA QUALITY</span><h2>Duplicate Detection</h2><p className="admin-help">Potential duplicates are grouped by record type and normalized name. Nothing is merged automatically.</p><div className="duplicate-grid">{duplicateGroups().length===0?<p className="admin-empty">No likely duplicate expanded records found.</p>:duplicateGroups().map((group,i)=><article key={i}><strong>{group[0].name}</strong><span>{recordTypes.find(t=>t.id===group[0].record_type_id)?.name||"Record"}</span>{group.map(r=><button key={r.id} onClick={()=>{setDatabaseTab("records");void openDatabaseRecord(r)}}>{r.record_code} • {r.workflow_status.replace(/_/g," ")}</button>)}</article>)}</div></section>}
{databaseTab==="templates"&&<section className="admin-panel"><span className="card-label">REUSABLE STRUCTURE</span><h2>Field Templates</h2><p className="admin-help">Templates suggest structured fields without locking your lore into a rigid schema.</p><div className="database-form-grid"><select value={templateForm.recordTypeId} onChange={e=>setTemplateForm({...templateForm,recordTypeId:e.target.value})}><option value="">Record type</option>{recordTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><input placeholder="Template name" value={templateForm.name} onChange={e=>setTemplateForm({...templateForm,name:e.target.value})}/><textarea className="json-editor" value={templateForm.fieldsText} onChange={e=>setTemplateForm({...templateForm,fieldsText:e.target.value})}/><button className="primary-action" onClick={()=>void createFieldTemplate()}>Create Template</button></div><div className="database-simple-grid">{fieldTemplates.map(t=><article key={t.id}><strong>{t.name}</strong><p>{recordTypes.find(x=>x.id===t.record_type_id)?.name||"Record"}</p><small>{t.fields?.length||0} suggested fields</small></article>)}</div></section>}
{databaseTab==="import"&&<section className="admin-panel"><span className="card-label">SMART INGEST</span><h2>Import & Autofill Center</h2><p className="admin-help">Paste character JSON, a database-record array, or an Umbra Studio export. Character-shaped data can be sent directly into Create Character for review before saving.</p><textarea className="import-editor" placeholder='Paste a character object or [{"record_type_slug":"artifact","name":"Example"}]' value={importText} onChange={e=>setImportText(e.target.value)}/><div className="bulk-actions"><button onClick={previewImport}>Analyze & Preview</button>{characterImportPreview&&<button className="primary-action" onClick={applyCharacterImport}>Open in Character Creator</button>}{importPreview.length>0&&<button onClick={()=>void commitImport()}>Import {importPreview.length} Records</button>}</div>{importError&&<p className="login-error">{importError}</p>}{characterImportPreview&&<div className="import-preview"><div><span>CHARACTER</span><strong>{characterImportPreview.name}</strong><small>{[characterImportPreview.race,characterImportPreview.homeland,characterImportPreview.canonStatus].filter(Boolean).join(" • ")||"Ready for creator review"}</small></div></div>}{importPreview.length>0&&<div className="import-preview">{importPreview.slice(0,50).map((r:any)=><div key={r.row}><span>#{r.row}</span><strong>{r.name}</strong><small>{r.record_type_slug} • {r.workflow_status}</small></div>)}</div>}</section>}
{databaseTab==="backup"&&<section className="admin-panel"><span className="card-label">PORTABILITY & RECOVERY</span><h2>Export & Backup Center</h2><p className="admin-help">Export the current operational database locally or create a named server snapshot before a major editing session.</p><div className="database-backup-actions"><button className="secondary-action" onClick={exportStudioData}>Export Full JSON</button>{adminRole==="primary_admin"&&<><input placeholder="Backup label — e.g. Before Moonwood Import" value={backupLabel} onChange={e=>setBackupLabel(e.target.value)}/><button className="primary-action" onClick={()=>void createStudioBackup()}>Create Named Snapshot</button></>}</div><div className="admin-feed">{backups.map(b=><div className="admin-feed-row" key={b.id}><strong>{b.label}</strong><span>{new Date(b.created_at).toLocaleString()}</span></div>)}</div></section>}
 </section></main>;
}

if(page==="admin"){
const pending=adminContent.filter(x=>x.workflow_status==="in_review").length;
return <main className="dashboard-shell admin-center-page"><header className="studio-header"><button className="brand-button" onClick={()=>setPage("dashboard")}><div className="brand-moon">☾</div><div className="brand-button-copy"><span className="header-eyebrow">UMBRA CONNECT</span><strong>Umbra Studio</strong></div></button><div className="account-area"><span className="admin-role-pill">{adminRole||"member"}</span><button className="back-button" onClick={()=>setPage("dashboard")}>Dashboard</button></div></header><section className="admin-center-shell"><div className="admin-center-hero"><div><p className="eyebrow">COLLABORATIVE DATABASE CONTROL</p><h1>Admin Center</h1><p>Manage your team, review content, follow changes, preserve revisions, and keep private production notes.</p></div><button className="secondary-action" onClick={()=>void loadAdminCenter()}>{adminBusy?"Refreshing...":"Refresh"}</button></div>{adminError&&<p className="login-error">{adminError}</p>}<div className="admin-metrics"><div><strong>{adminMembers.length}</strong><span>Team Members</span></div><div><strong>{adminContent.length}</strong><span>Managed Records</span></div><div><strong>{pending}</strong><span>In Review</span></div><div><strong>{adminRevisions.length}</strong><span>Recent Revisions</span></div></div><nav className="admin-tabs">{(["overview","content","activity","sessions","revisions","notes","team"] as const).map(tab=><button key={tab} className={adminTab===tab?"active":""} onClick={()=>setAdminTab(tab)}>{tab}</button>)}</nav>
{adminTab==="overview"&&<div className="admin-overview-grid"><section className="admin-panel"><span className="card-label">WORKFLOW</span><h2>Editorial Queue</h2><p>{pending?`${pending} record${pending===1?" is":"s are"} waiting for review.`:"Nothing is waiting for review."}</p><button className="secondary-action" onClick={()=>setAdminTab("content")}>Open Content Manager</button></section><section className="admin-panel"><span className="card-label">RECENT ACTIVITY</span><h2>Latest Changes</h2>{adminActivity.slice(0,6).map(x=><div className="admin-feed-row" key={x.id}><strong>{x.entity_label||x.entity_type}</strong><span>{x.action.replace(/_/g," ")} • {adminMembers.find(m=>m.user_id===x.actor_user_id)?.display_name||x.actor_email||"system"}</span></div>)}</section></div>}
{adminTab==="content"&&<section className="admin-panel"><div className="admin-panel-heading"><div><span className="card-label">DATABASE WORKFLOW</span><h2>Content Manager</h2></div><small>Draft → In Review → Approved → Published</small></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Record</th><th>Type</th><th>Creator</th><th>Workflow</th><th>Updated</th></tr></thead><tbody>{adminContent.map(row=><tr key={`${row.entity_type}:${row.id}`}><td><strong>{row.label}</strong></td><td>{row.entity_type}</td><td>{adminMembers.find(x=>x.user_id===row.user_id)?.display_name||adminMembers.find(x=>x.user_id===row.user_id)?.email||"Creator"}</td><td><select value={row.workflow_status} onChange={e=>void setWorkflowStatus(row,e.target.value)}><option value="draft">Draft</option><option value="in_review">In Review</option><option value="approved">Approved</option><option value="published">Published</option></select></td><td>{row.updated_at?new Date(row.updated_at).toLocaleString():"—"}</td></tr>)}</tbody></table></div></section>}
{adminTab==="activity"&&<section className="admin-panel"><span className="card-label">AUDIT TRAIL</span><h2>Activity Log</h2><div className="admin-feed">{adminActivity.map(x=><div className="admin-feed-row" key={x.id}><div><strong>{x.entity_label||x.entity_type}</strong><span>{x.action.replace(/_/g," ")}</span></div><small>{adminMembers.find(m=>m.user_id===x.actor_user_id)?.display_name||x.actor_email||"system"} • {new Date(x.created_at).toLocaleString()}</small></div>)}</div></section>}
{adminTab==="sessions"&&<section className="admin-panel"><span className="card-label">LOGIN & PRESENCE HISTORY</span><h2>Collaborator Sessions</h2><p className="admin-help">Every authorized Studio login is timestamped. Last seen updates while Studio remains open.</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Collaborator</th><th>Role</th><th>Signed In</th><th>Last Seen</th><th>Signed Out</th></tr></thead><tbody>{collaboratorSessions.map(x=><tr key={x.id}><td><strong>{x.display_name||adminMembers.find(m=>m.user_id===x.user_id)?.display_name||x.email||"Studio Member"}</strong></td><td>{x.role||"member"}</td><td>{new Date(x.signed_in_at).toLocaleString()}</td><td>{new Date(x.last_seen_at).toLocaleString()}</td><td>{x.signed_out_at?new Date(x.signed_out_at).toLocaleString():<span className="presence-live">● Active / no logout recorded</span>}</td></tr>)}</tbody></table></div></section>}
{adminTab==="revisions"&&<section className="admin-panel"><span className="card-label">VERSION HISTORY</span><h2>Recent Revisions</h2><p className="admin-help">A snapshot is captured before tracked records are changed or deleted, giving you a history independent of the live record.</p><div className="admin-feed">{adminRevisions.map(x=><details className="revision-row" key={x.id}><summary><strong>{x.entity_label||x.entity_type}</strong><span>{adminMembers.find(m=>m.user_id===x.changed_by)?.display_name||x.changed_by_email||"system"} • {new Date(x.created_at).toLocaleString()}</span></summary><pre>{JSON.stringify(x.snapshot,null,2)}</pre></details>)}</div></section>}
{adminTab==="notes"&&<section className="admin-panel"><span className="card-label">PRIVATE PRODUCTION NOTES</span><h2>Admin Notes</h2><div className="admin-note-form"><select value={adminNoteEntityType} onChange={e=>setAdminNoteEntityType(e.target.value)}><option value="general">General Studio</option><option value="character">Character</option><option value="codex">Codex</option><option value="location">Location</option><option value="timeline">Timeline</option></select><input value={adminNoteEntityId} onChange={e=>setAdminNoteEntityId(e.target.value)} placeholder="Record ID or studio"/><textarea value={adminNoteText} onChange={e=>setAdminNoteText(e.target.value)} placeholder="Private note for the admin team..."/><button className="primary-action" onClick={()=>void addAdminNote()}>Add Private Note</button></div><div className="admin-feed">{adminNotes.map(n=><div className="admin-note-card" key={n.id}><div><span>{n.entity_type} • {n.entity_id}</span><small>{n.created_by_email||"admin"} • {new Date(n.updated_at).toLocaleString()}</small></div><p>{n.note}</p><button onClick={()=>void deleteAdminNote(n.id)}>Delete</button></div>)}</div></section>}
{adminTab==="team"&&<section className="admin-panel"><span className="card-label">ACCESS & ROLES</span><h2>Studio Team</h2>{adminRole==="primary_admin"&&<div className="admin-add-member"><input type="email" value={adminMemberEmail} onChange={e=>setAdminMemberEmail(e.target.value)} placeholder="Existing Umbra Studio account email"/><select value={adminMemberRole} onChange={e=>setAdminMemberRole(e.target.value as StudioAdminMember["role"])}><option value="editor">Editor</option><option value="admin">Admin</option><option value="primary_admin">Primary Admin</option></select><button className="primary-action" onClick={()=>void addStudioAdmin()}>Add Collaborator</button></div>}<div className="admin-team-grid">{adminMembers.map(m=><article className="admin-member-card" key={m.user_id}><div><strong>{m.display_name||m.email||"Studio Member"}</strong><span>{m.email}</span></div><span className="admin-role-pill">{m.role}</span><small>Last login: {m.last_login_at?new Date(m.last_login_at).toLocaleString():"Never recorded"}</small>{adminRole==="primary_admin"&&<div className="admin-member-actions"><button onClick={()=>{const n=prompt("Studio display name",m.display_name||"");if(n)void setMemberDisplayName(m.user_id,n)}}>Rename</button><select value={m.role} disabled={m.user_id===session?.user.id&&adminMembers.filter(x=>x.role==="primary_admin").length===1} onChange={e=>void changeAdminRole(m.user_id,e.target.value as StudioAdminMember["role"])}><option value="editor">Editor</option><option value="admin">Admin</option><option value="primary_admin">Primary Admin</option></select><button disabled={m.user_id===session?.user.id&&adminMembers.filter(x=>x.role==="primary_admin").length===1} onClick={()=>void removeStudioAdmin(m.user_id)}>Remove</button></div>}</article>)}</div></section>}</section></main>;
}

return ( <main className="dashboard-shell"> <header className="studio-header"> <div className="brand"> <div className="brand-moon">
☾ </div>

      <div>
        <p className="header-eyebrow">
          UMBRA CONNECT
        </p>

        <h2>
          Umbra Studio
        </h2>
      </div>
    </div>

    <div className="account-area">
      <div className="connection-dot" />

      <div className="account-copy">
        <span>
          Connected
        </span>

        <small>
          {session.user.email}
        </small>
      </div>

      <button
        type="button"
        className="sign-out-button"
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </div>
  </header>

  <section className="dashboard-content">
    <div className="welcome-section">
      <p className="eyebrow">
        THE UMBRAL WORLD AWAITS
      </p>

      <h1>
        Welcome to Umbra Studio
      </h1>

      <p>
        Create, organize, and develop the
        characters that inhabit your world.
      </p>
    </div>

    <section className="studio-command-center">
      <div className="command-search"><span>⌕</span><input type="search" value={studioSearch} onChange={e=>setStudioSearch(e.target.value)} placeholder="Search your Studio — characters, Codex, locations, timeline..."/></div>
      <div className="dashboard-stats"><div><strong>{studioCharacters.length}</strong><span>Characters</span></div><div><strong>{worldRecords.length}</strong><span>Codex</span></div><div><strong>{worldLocations.filter(x=>!x.archived_at).length}</strong><span>Locations</span></div><div><strong>{timelineEvents.filter(x=>!x.archived_at).length}</strong><span>Events</span></div></div>
      {studioSearch.trim()&&<div className="command-results">{studioCharacters.filter(x=>[x.name,x.identity?.alias,x.identity?.summary].filter(Boolean).join(" ").toLowerCase().includes(studioSearch.toLowerCase())).slice(0,4).map(x=><button key={x.id} onClick={()=>openCharacterProfile(x,"characters")}><span>CHARACTER</span><strong>{x.name}</strong></button>)}{worldRecords.filter(x=>[x.name,x.subtype,x.description].filter(Boolean).join(" ").toLowerCase().includes(studioSearch.toLowerCase())).slice(0,4).map(x=><button key={x.id} onClick={()=>void openWorldOrganization(x)}><span>CODEX</span><strong>{x.name}</strong></button>)}{worldLocations.filter(x=>!x.archived_at&&[x.name,x.description,...(x.tags||[])].filter(Boolean).join(" ").toLowerCase().includes(studioSearch.toLowerCase())).slice(0,4).map(x=><button key={x.id} onClick={()=>{setSelectedLocationId(x.id);void openWorldExplorer("map")}}><span>LOCATION</span><strong>{x.name}</strong></button>)}{timelineEvents.filter(x=>!x.archived_at&&[x.title,x.era,x.display_date,x.description].filter(Boolean).join(" ").toLowerCase().includes(studioSearch.toLowerCase())).slice(0,3).map(x=><button key={x.id} onClick={()=>void openWorldExplorer("timeline")}><span>TIMELINE</span><strong>{x.title}</strong></button>)}{databaseRecords.filter(x=>!x.archived_at&&[x.record_code,x.name,x.subtitle,x.summary].filter(Boolean).join(" ").toLowerCase().includes(studioSearch.toLowerCase())).slice(0,3).map(x=><button key={x.id} onClick={()=>void openWorldDatabase("records")}><span>LORE DATABASE</span><strong>{x.name}</strong></button>)}{storyProjects.filter(x=>[x.title,x.summary].filter(Boolean).join(" ").toLowerCase().includes(studioSearch.toLowerCase())).slice(0,3).map(x=><button key={x.id} onClick={()=>void openProduction("projects")}><span>PROJECT</span><strong>{x.title}</strong></button>)}{storyArcs.filter(x=>[x.title,x.summary].filter(Boolean).join(" ").toLowerCase().includes(studioSearch.toLowerCase())).slice(0,3).map(x=><button key={x.id} onClick={()=>void openProduction("arcs")}><span>STORY ARC</span><strong>{x.title}</strong></button>)}{storyScenes.filter(x=>[x.title,x.summary,x.era].filter(Boolean).join(" ").toLowerCase().includes(studioSearch.toLowerCase())).slice(0,3).map(x=><button key={x.id} onClick={()=>void openProduction("scenes")}><span>SCENE</span><strong>{x.title}</strong></button>)}</div>}
    </section>

    <section className="v10-dashboard-pulse"><div className="v10-pulse-head"><div><span className="card-label">STUDIO 1.0 COMMAND CENTER</span><h2>{studioSettings?.studio_subtitle||"Production Pulse"}</h2></div><div className="v10-quick-actions"><button onClick={()=>void openProduction("projects")}>+ Story Project</button><button onClick={()=>void openWorldDatabase("records")}>+ Lore Record</button><button onClick={()=>void openProduction("inbox")}>Inbox</button></div></div><div className="v10-pulse-grid"><button onClick={()=>void openProduction("inbox")}><strong>{studioNotifications.filter(x=>!x.is_read).length}</strong><span>Unread Notifications</span></button><button onClick={()=>void openProduction("assignments")}><strong>{studioAssignments.filter(x=>!["done","cancelled"].includes(x.status)).length}</strong><span>Open Assignments</span></button><button onClick={()=>void openWorldDatabase("continuity")}><strong>{continuityIssues.filter(x=>["open","reviewing"].includes(x.status)).length}</strong><span>Continuity Alerts</span></button><button onClick={()=>void openProduction("overview")}><strong>{changesSinceVisit.length}</strong><span>Changes Since Visit</span></button></div>{studioSettings?.show_dashboard_activity!==false&&changesSinceVisit.length>0&&<div className="v10-recent-strip">{changesSinceVisit.slice(0,4).map(x=><span key={x.id}><strong>{x.actor_name}</strong> {x.action.replace(/_/g," ")} <em>{x.entity_label||x.entity_type}</em></span>)}</div>}</section>

    <div className="dashboard-grid">
      <button
        type="button"
        className="dashboard-card primary-card"
        onClick={openCreateCharacter}
      >
        <div className="card-icon">
          ✦
        </div>

        <div>
          <span className="card-label">
            CREATE
          </span>

          <h3>
            Create Character
          </h3>

          <p>
            Begin a new character and bring
            another soul into the Umbral World.
          </p>
        </div>

        <span className="card-arrow">
          →
        </span>
      </button>

      <button
        type="button"
        className="dashboard-card"
        onClick={openMyCharacters}
      >
        <div className="card-icon">
          ♙
        </div>

        <div>
          <span className="card-label">
            YOUR CREATIONS
          </span>

          <h3>
            My Characters
          </h3>

          <p>
            Continue working on your characters,
            designs, lore, and profiles.
          </p>
        </div>

        <span className="card-arrow">
          →
        </span>
      </button>

      <button
        type="button"
        className="dashboard-card"
        onClick={openCharacterLibrary}
      >
        <div className="card-icon">
          ◆
        </div>

        <div>
          <span className="card-label">
            EXPLORE
          </span>

          <h3>
            Character Library
          </h3>

          <p>
            Browse characters connected to the
            Umbra Connect universe.
          </p>
        </div>

        <span className="card-arrow">
          →
        </span>
      </button>

      <button
        type="button"
        className="dashboard-card"
        onClick={() => void openWorldOrganization()}
      >
        <div className="card-icon">⌘</div>
        <div>
          <span className="card-label">WORLDBUILDING</span>
          <h3>World Organization</h3>
          <p>Manage realms, races, factions, clans, houses, families, and bloodlines.</p>
        </div>
        <span className="card-arrow">→</span>
      </button>

      <button type="button" className="dashboard-card" onClick={() => void openWorldExplorer("map")}>
        <div className="card-icon">✧</div><div><span className="card-label">EXPLORE & CHRONICLE</span><h3>World Explorer</h3><p>Open the interactive map, nested locations, historical timeline, tags, and favorites.</p></div><span className="card-arrow">→</span>
      </button>


      <button type="button" className="dashboard-card database-dashboard-card" onClick={() => void openWorldDatabase()}><div className="card-icon">▦</div><div><span className="card-label">CANON • DATABASE • PUBLISHING</span><h3>World Database</h3><p>Control canon, continuity, public encyclopedia records, expanded lore, collections, links, media, imports, exports, and backups.</p></div><span className="card-arrow">→</span></button>

      <button type="button" className="dashboard-card production-dashboard-card" onClick={() => void openProduction()}>
        <div className="card-icon">✦</div>
        <div>
          <span className="card-label">STORY • PLANNING • COLLABORATION</span>
          <h3>Story Production Center</h3>
          <p>Build projects, story arcs, scenes, plot beats, character journeys, assignments, reviews, notifications, and story-world connections.</p>
        </div>
        <span className="card-arrow">→</span>
      </button>

      <button type="button" className="dashboard-card v101-messages-card" onClick={() => void openMessages()}><div className="card-icon">✉</div><div><span className="card-label">COLLABORATOR • DIRECT MESSAGES</span><h3>Studio Messages</h3><p>Private conversations with your authorized Studio collaborators, with unread and read status.</p></div><span className="card-arrow">→</span></button>

      <button type="button" className="dashboard-card v101-transfer-card" onClick={() => void openTransferCenter()}><div className="card-icon">⇩</div><div><span className="card-label">BACKUP • TRANSFER • SETUP</span><h3>Backup & Transfer Center</h3><p>Download complete Studio backups, create cloud snapshots, validate backup files, and set up another admin computer.</p></div><span className="card-arrow">→</span></button>

      <button type="button" className="dashboard-card v10-settings-card" onClick={() => void openStudioSettings()}><div className="card-icon">⚙</div><div><span className="card-label">STUDIO 1.0 • PREFERENCES</span><h3>Studio Settings</h3><p>Control autosave, canon and spoiler defaults, collaborator presence, dashboard preferences, and Studio identity.</p></div><span className="card-arrow">→</span></button>

      <button type="button" className="dashboard-card admin-dashboard-card" onClick={() => void openAdminCenter()}><div className="card-icon">⚙</div><div><span className="card-label">COLLABORATE & MANAGE</span><h3>Admin Center</h3><p>Manage collaborator names, login timestamps, presence history, editorial workflow, revisions, private notes, and the full change trail.</p></div><span className="card-arrow">→</span></button>
    </div>

    <div className="studio-footer-card">
      <div>
        <span className="connected-check">
          ✓
        </span>

        <strong>
          Connected to Umbra Connect
        </strong>
      </div>

      <p>
        Your Umbra Studio account is synchronized
        with your Umbra Connect identity.
      </p>
    </div>
  </section>
</main>

);
}

export default App;

