-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "kind" TEXT,
    "canLogin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "funnelStep" INTEGER,
    "sortOrder" INTEGER NOT NULL,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#94a3b8',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateStageHistory" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "changedBy" TEXT,
    "changedVia" TEXT NOT NULL DEFAULT 'manual',
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "displayName" TEXT,
    "fullName" TEXT,
    "fullNameKana" TEXT,
    "birthDate" DATE,
    "age" INTEGER,
    "phone" TEXT,
    "email" TEXT,
    "photoPath" TEXT,
    "nearestStation" TEXT,
    "employmentCategory" TEXT,
    "licenses" TEXT[],
    "experienceYears" DECIMAL(4,1),
    "currentCompany" TEXT,
    "currentStore" TEXT,
    "changeReason" TEXT,
    "prevSalary" INTEGER,
    "prevWorkingHours" TEXT,
    "prevDaysOff" TEXT,
    "desiredPrefecture" TEXT,
    "desiredAreaText" TEXT,
    "changeTiming" TEXT,
    "familyStatus" TEXT,
    "questions" TEXT,
    "instagram" TEXT,
    "xAccount" TEXT,
    "source" TEXT,
    "sourceDetail" TEXT,
    "registrationSource" TEXT NOT NULL DEFAULT 'line',
    "externalRef" TEXT,
    "stageId" TEXT NOT NULL,
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "ownerUserId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "offerYear" INTEGER,
    "joinFiscalYear" INTEGER,
    "directorCandidate" BOOLEAN NOT NULL DEFAULT false,
    "overallRating" TEXT,
    "lineFriendAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "memo" TEXT,
    "mergedIntoCandidateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineFriend" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "pictureUrl" TEXT,
    "statusMessage" TEXT,
    "language" TEXT,
    "followedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unfollowedAt" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "profileSyncedAt" TIMESTAMP(3),
    "richMenuId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineFriend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateDesiredArea" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "prefecture" TEXT,
    "areaId" TEXT,
    "note" TEXT,

    CONSTRAINT "CandidateDesiredArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateTag" (
    "candidateId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "assignedVia" TEXT NOT NULL DEFAULT 'manual',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateTag_pkey" PRIMARY KEY ("candidateId","tagId")
);

-- CreateTable
CREATE TABLE "CandidateNote" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateMergeLog" (
    "id" TEXT NOT NULL,
    "sourceCandidateId" TEXT NOT NULL,
    "targetCandidateId" TEXT NOT NULL,
    "mergedBy" TEXT,
    "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "movedSummary" JSONB,
    "snapshot" JSONB,

    CONSTRAINT "CandidateMergeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "interviewerUserId" TEXT,
    "interviewerName" TEXT,
    "storeId" TEXT,
    "location" TEXT,
    "zoomRecordingUrl" TEXT,
    "zoomPasscode" TEXT,
    "zoomMeetingId" TEXT,
    "result" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPreference" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "desiredAt" TIMESTAMP(3) NOT NULL,
    "formSubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewEvaluation" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "evaluatorUserId" TEXT,
    "scorePersonality" INTEGER NOT NULL,
    "scoreCommunication" INTEGER NOT NULL,
    "scoreExperience" INTEGER NOT NULL,
    "scoreSkill" INTEGER NOT NULL,
    "scoreMotivation" INTEGER NOT NULL,
    "scoreRetention" INTEGER NOT NULL,
    "scoreCultureFit" INTEGER NOT NULL,
    "overall" TEXT NOT NULL,
    "goodPoints" TEXT,
    "concerns" TEXT,
    "handoverNote" TEXT,
    "directorPotential" TEXT,
    "memo" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "ownerName" TEXT,
    "directorName" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Introduction" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "storeId" TEXT,
    "areaId" TEXT,
    "ownerUserId" TEXT,
    "ownerName" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "introducedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "introducedBy" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Introduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "salary" INTEGER,
    "salaryNote" TEXT,
    "employmentType" TEXT,
    "storeId" TEXT,
    "areaId" TEXT,
    "offeredAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "joinDate" DATE,
    "joinedAt" TIMESTAMP(3),
    "tokyoSeminarAttended" BOOLEAN,
    "tokyoSeminarDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'offered',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentOutcome" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reasonCode" TEXT,
    "reasonDetail" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedBy" TEXT,

    CONSTRAINT "RecruitmentOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLink" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "sourceSystem" TEXT,
    "joinedOn" DATE,
    "leftOn" DATE,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mapsTo" TEXT,
    "helpText" TEXT,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormFieldTagRule" (
    "id" TEXT NOT NULL,
    "formFieldId" TEXT NOT NULL,
    "matchValue" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "FormFieldTagRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "appliedActions" JSONB,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormAccessToken" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "lineEventId" TEXT,
    "type" TEXT NOT NULL,
    "lineUserId" TEXT,
    "payload" JSONB NOT NULL,
    "signatureValid" BOOLEAN NOT NULL DEFAULT true,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processError" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "handlingStatus" TEXT NOT NULL DEFAULT 'unhandled',
    "assigneeUserId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "text" TEXT,
    "mediaPath" TEXT,
    "lineMessageId" TEXT,
    "templateId" TEXT,
    "sentByUserId" TEXT,
    "sendChannel" TEXT,
    "sourceKind" TEXT,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "webhookEventId" TEXT,
    "messageJobId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "candidateId" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "idempotencyKey" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateBlock" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "blockType" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "mediaAssetId" TEXT,

    CONSTRAINT "TemplateBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSuccessTemplate" (
    "formCode" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "FormSuccessTemplate_pkey" PRIMARY KEY ("formCode","templateId")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "previewPath" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RichMenu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageAssetId" TEXT,
    "size" TEXT NOT NULL DEFAULT 'full',
    "chatBarText" TEXT NOT NULL DEFAULT 'メニュー',
    "lineRichMenuId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RichMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RichMenuArea" (
    "id" TEXT NOT NULL,
    "richMenuId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "label" TEXT,
    "actionType" TEXT NOT NULL,
    "actionPayload" JSONB NOT NULL,

    CONSTRAINT "RichMenuArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedBy" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'validating',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNo" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "candidateId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startConditions" JSONB,
    "stopConditions" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "maxPerDay" INTEGER NOT NULL DEFAULT 1,
    "sendWindowStart" TEXT,
    "sendWindowEnd" TEXT,
    "allowDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "autoEnroll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioStep" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "delayMinutes" INTEGER,
    "absoluteAt" TIMESTAMP(3),
    "sendAtTime" TEXT,
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ScenarioStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioEnrollment" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentStepNo" INTEGER NOT NULL DEFAULT 0,
    "nextSendAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolledVia" TEXT NOT NULL DEFAULT 'auto',
    "stoppedAt" TIMESTAMP(3),
    "stopReason" TEXT,

    CONSTRAINT "ScenarioEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioDelivery" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "scenarioStepId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "skipReason" TEXT,
    "messageId" TEXT,

    CONSTRAINT "ScenarioDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "targetFilter" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastRecipient" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "messageId" TEXT,
    "error" TEXT,

    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_canLogin_isActive_idx" ON "User"("canLogin", "isActive");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_code_key" ON "PipelineStage"("code");

-- CreateIndex
CREATE INDEX "CandidateStageHistory_candidateId_changedAt_idx" ON "CandidateStageHistory"("candidateId", "changedAt");

-- CreateIndex
CREATE INDEX "CandidateStageHistory_toStageId_changedAt_idx" ON "CandidateStageHistory"("toStageId", "changedAt");

-- CreateIndex
CREATE INDEX "Candidate_stageId_status_idx" ON "Candidate"("stageId", "status");

-- CreateIndex
CREATE INDEX "Candidate_employmentCategory_offerYear_idx" ON "Candidate"("employmentCategory", "offerYear");

-- CreateIndex
CREATE INDEX "Candidate_joinFiscalYear_idx" ON "Candidate"("joinFiscalYear");

-- CreateIndex
CREATE INDEX "Candidate_appliedAt_idx" ON "Candidate"("appliedAt");

-- CreateIndex
CREATE INDEX "Candidate_registrationSource_idx" ON "Candidate"("registrationSource");

-- CreateIndex
CREATE INDEX "Candidate_fullName_idx" ON "Candidate"("fullName");

-- CreateIndex
CREATE INDEX "Candidate_phone_idx" ON "Candidate"("phone");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_nearestStation_idx" ON "Candidate"("nearestStation");

-- CreateIndex
CREATE INDEX "Candidate_mergedIntoCandidateId_idx" ON "Candidate"("mergedIntoCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "LineFriend_candidateId_key" ON "LineFriend"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "LineFriend_lineUserId_key" ON "LineFriend"("lineUserId");

-- CreateIndex
CREATE INDEX "LineFriend_isBlocked_idx" ON "LineFriend"("isBlocked");

-- CreateIndex
CREATE INDEX "CandidateDesiredArea_prefecture_idx" ON "CandidateDesiredArea"("prefecture");

-- CreateIndex
CREATE INDEX "CandidateDesiredArea_areaId_idx" ON "CandidateDesiredArea"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateDesiredArea_candidateId_rank_key" ON "CandidateDesiredArea"("candidateId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_category_name_key" ON "Tag"("category", "name");

-- CreateIndex
CREATE INDEX "CandidateTag_tagId_idx" ON "CandidateTag"("tagId");

-- CreateIndex
CREATE INDEX "CandidateNote_candidateId_createdAt_idx" ON "CandidateNote"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateMergeLog_targetCandidateId_idx" ON "CandidateMergeLog"("targetCandidateId");

-- CreateIndex
CREATE INDEX "Interview_candidateId_kind_idx" ON "Interview"("candidateId", "kind");

-- CreateIndex
CREATE INDEX "Interview_status_scheduledAt_idx" ON "Interview"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "InterviewPreference_candidateId_rank_idx" ON "InterviewPreference"("candidateId", "rank");

-- CreateIndex
CREATE INDEX "InterviewEvaluation_candidateId_idx" ON "InterviewEvaluation"("candidateId");

-- CreateIndex
CREATE INDEX "InterviewEvaluation_overall_idx" ON "InterviewEvaluation"("overall");

-- CreateIndex
CREATE UNIQUE INDEX "Area_prefecture_name_key" ON "Area"("prefecture", "name");

-- CreateIndex
CREATE INDEX "Store_areaId_idx" ON "Store"("areaId");

-- CreateIndex
CREATE INDEX "Introduction_candidateId_sequence_idx" ON "Introduction"("candidateId", "sequence");

-- CreateIndex
CREATE INDEX "Introduction_response_idx" ON "Introduction"("response");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_candidateId_key" ON "Offer"("candidateId");

-- CreateIndex
CREATE INDEX "Offer_joinDate_idx" ON "Offer"("joinDate");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentOutcome_candidateId_key" ON "RecruitmentOutcome"("candidateId");

-- CreateIndex
CREATE INDEX "RecruitmentOutcome_result_decidedAt_idx" ON "RecruitmentOutcome"("result", "decidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLink_candidateId_key" ON "EmployeeLink"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Form_code_key" ON "Form"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_key_key" ON "FormField"("formId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldTagRule_formFieldId_matchValue_tagId_key" ON "FormFieldTagRule"("formFieldId", "matchValue", "tagId");

-- CreateIndex
CREATE INDEX "FormSubmission_candidateId_submittedAt_idx" ON "FormSubmission"("candidateId", "submittedAt");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_submittedAt_idx" ON "FormSubmission"("formId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FormAccessToken_token_key" ON "FormAccessToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_lineEventId_key" ON "WebhookEvent"("lineEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_processedAt_idx" ON "WebhookEvent"("processedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_lineUserId_idx" ON "WebhookEvent"("lineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_candidateId_key" ON "Conversation"("candidateId");

-- CreateIndex
CREATE INDEX "Conversation_handlingStatus_lastMessageAt_idx" ON "Conversation"("handlingStatus", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_lineMessageId_key" ON "Message"("lineMessageId");

-- CreateIndex
CREATE INDEX "Message_candidateId_sentAt_idx" ON "Message"("candidateId", "sentAt");

-- CreateIndex
CREATE INDEX "Message_direction_sentAt_idx" ON "Message"("direction", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageJob_idempotencyKey_key" ON "MessageJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MessageJob_status_runAt_priority_idx" ON "MessageJob"("status", "runAt", "priority");

-- CreateIndex
CREATE INDEX "Template_category_isActive_idx" ON "Template"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateBlock_templateId_sortOrder_key" ON "TemplateBlock"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "MediaAsset_type_idx" ON "MediaAsset"("type");

-- CreateIndex
CREATE INDEX "RichMenuArea_richMenuId_idx" ON "RichMenuArea"("richMenuId");

-- CreateIndex
CREATE INDEX "ImportRow_batchId_rowNo_idx" ON "ImportRow"("batchId", "rowNo");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioStep_scenarioId_stepNo_key" ON "ScenarioStep"("scenarioId", "stepNo");

-- CreateIndex
CREATE INDEX "ScenarioEnrollment_status_nextSendAt_idx" ON "ScenarioEnrollment"("status", "nextSendAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioEnrollment_scenarioId_candidateId_key" ON "ScenarioEnrollment"("scenarioId", "candidateId");

-- CreateIndex
CREATE INDEX "ScenarioDelivery_candidateId_scheduledAt_idx" ON "ScenarioDelivery"("candidateId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRecipient_broadcastId_candidateId_key" ON "BroadcastRecipient"("broadcastId", "candidateId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateStageHistory" ADD CONSTRAINT "CandidateStageHistory_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateStageHistory" ADD CONSTRAINT "CandidateStageHistory_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateStageHistory" ADD CONSTRAINT "CandidateStageHistory_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateStageHistory" ADD CONSTRAINT "CandidateStageHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_mergedIntoCandidateId_fkey" FOREIGN KEY ("mergedIntoCandidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineFriend" ADD CONSTRAINT "LineFriend_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineFriend" ADD CONSTRAINT "LineFriend_richMenuId_fkey" FOREIGN KEY ("richMenuId") REFERENCES "RichMenu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateDesiredArea" ADD CONSTRAINT "CandidateDesiredArea_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateDesiredArea" ADD CONSTRAINT "CandidateDesiredArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTag" ADD CONSTRAINT "CandidateTag_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTag" ADD CONSTRAINT "CandidateTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTag" ADD CONSTRAINT "CandidateTag_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateMergeLog" ADD CONSTRAINT "CandidateMergeLog_sourceCandidateId_fkey" FOREIGN KEY ("sourceCandidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateMergeLog" ADD CONSTRAINT "CandidateMergeLog_targetCandidateId_fkey" FOREIGN KEY ("targetCandidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateMergeLog" ADD CONSTRAINT "CandidateMergeLog_mergedBy_fkey" FOREIGN KEY ("mergedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_interviewerUserId_fkey" FOREIGN KEY ("interviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPreference" ADD CONSTRAINT "InterviewPreference_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPreference" ADD CONSTRAINT "InterviewPreference_formSubmissionId_fkey" FOREIGN KEY ("formSubmissionId") REFERENCES "FormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_introducedBy_fkey" FOREIGN KEY ("introducedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentOutcome" ADD CONSTRAINT "RecruitmentOutcome_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLink" ADD CONSTRAINT "EmployeeLink_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldTagRule" ADD CONSTRAINT "FormFieldTagRule_formFieldId_fkey" FOREIGN KEY ("formFieldId") REFERENCES "FormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldTagRule" ADD CONSTRAINT "FormFieldTagRule_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAccessToken" ADD CONSTRAINT "FormAccessToken_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAccessToken" ADD CONSTRAINT "FormAccessToken_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_messageJobId_fkey" FOREIGN KEY ("messageJobId") REFERENCES "MessageJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageJob" ADD CONSTRAINT "MessageJob_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateBlock" ADD CONSTRAINT "TemplateBlock_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateBlock" ADD CONSTRAINT "TemplateBlock_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSuccessTemplate" ADD CONSTRAINT "FormSuccessTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RichMenu" ADD CONSTRAINT "RichMenu_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RichMenuArea" ADD CONSTRAINT "RichMenuArea_richMenuId_fkey" FOREIGN KEY ("richMenuId") REFERENCES "RichMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioStep" ADD CONSTRAINT "ScenarioStep_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioStep" ADD CONSTRAINT "ScenarioStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioEnrollment" ADD CONSTRAINT "ScenarioEnrollment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioEnrollment" ADD CONSTRAINT "ScenarioEnrollment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioDelivery" ADD CONSTRAINT "ScenarioDelivery_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ScenarioEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioDelivery" ADD CONSTRAINT "ScenarioDelivery_scenarioStepId_fkey" FOREIGN KEY ("scenarioStepId") REFERENCES "ScenarioStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioDelivery" ADD CONSTRAINT "ScenarioDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

