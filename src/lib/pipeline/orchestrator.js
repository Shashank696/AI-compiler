import { PipelineRun } from "@/api/localStorageDB";
import { runStage1, runStage2, runStage3, runStage4, runStage5, runStage6, runStage7 } from "./stages";

export async function orchestratePipeline(prompt, onStageUpdate) {
  const pipelineStart = Date.now();
  const stageLatencies = {};
  let repairCount = 0;
  let runId = null;

  // Create initial run record
  const runRecord = await PipelineRun.create({
    prompt,
    status: "running",
    repair_count: 0,
    total_latency_ms: 0,
    stage_latencies: JSON.stringify({})
  });
  runId = runRecord.id;

  const updateStage = (stage, data) => {
    if (onStageUpdate) onStageUpdate(stage, data);
  };

  try {
    // ── Stage 1: Intent Extraction ──────────────────────────────────────────
    updateStage("stage1", { status: "running" });
    const s1Start = Date.now();
    const stage1 = await runStage1(prompt);
    stageLatencies.stage1 = Date.now() - s1Start;

    if (stage1.errors.length > 0) {
      throw new Error(`Stage 1 schema violation: ${JSON.stringify(stage1.errors)}`);
    }
    updateStage("stage1", { status: "complete", output: stage1.output });

    // ── Stage 2: Architecture Generation ────────────────────────────────────
    updateStage("stage2", { status: "running" });
    const s2Start = Date.now();
    const stage2 = await runStage2(stage1.output);
    stageLatencies.stage2 = Date.now() - s2Start;

    if (stage2.errors.length > 0) {
      throw new Error(`Stage 2 schema violation: ${JSON.stringify(stage2.errors)}`);
    }
    updateStage("stage2", { status: "complete", output: stage2.output });

    // ── Stage 3: Schema Generation ───────────────────────────────────────────
    updateStage("stage3", { status: "running" });
    const s3Start = Date.now();
    const stage3 = await runStage3(stage1.output, stage2.output);
    stageLatencies.stage3 = Date.now() - s3Start;

    if (stage3.errors.length > 0) {
      throw new Error(`Stage 3 schema violation: ${JSON.stringify(stage3.errors)}`);
    }
    updateStage("stage3", { status: "complete", output: stage3.output });

    // ── Stage 4: Validation Engine ───────────────────────────────────────────
    updateStage("stage4", { status: "running" });
    const s4Start = Date.now();
    const stage4 = await runStage4(stage3.output);
    stageLatencies.stage4 = Date.now() - s4Start;
    updateStage("stage4", { status: "complete", output: stage4, dependencyGraph: stage4.dependency_graph });

    // ── Stage 5: Repair Engine (auto) ────────────────────────────────────────
    let currentSchemas = stage3.output;
    let repairLog = [];

    if (!stage4.is_valid) {
      updateStage("stage5", { status: "running", issues: stage4.issues });
      const s5Start = Date.now();
      const stage5 = await runStage5(stage3.output, stage4.issues);
      stageLatencies.stage5 = Date.now() - s5Start;
      currentSchemas = stage5.output;
      repairLog = stage5.repair_log;
      repairCount = stage5.repairs_applied;
      updateStage("stage5", { status: "complete", output: stage5.output, repair_log: repairLog });

      // Re-validate after repair
      const revalidation = await runStage4(currentSchemas);
      if (!revalidation.is_valid) {
        updateStage("stage5", { status: "repaired", note: "Some issues remain after repair" });
      }
    } else {
      updateStage("stage5", { status: "skipped", note: "No issues detected — repair not needed" });
    }

    // ── Stage 6: Refinement ──────────────────────────────────────────────────
    updateStage("stage6", { status: "running" });
    const s6Start = Date.now();
    const stage6 = await runStage6(stage1.output, currentSchemas);
    stageLatencies.stage6 = Date.now() - s6Start;
    currentSchemas = stage6.output;
    updateStage("stage6", { status: "complete", output: stage6.output });

    // ── Stage 7: Runtime Engine ──────────────────────────────────────────────
    updateStage("stage7", { status: "running" });
    const s7Start = Date.now();
    const runtime = await runStage7(currentSchemas);
    stageLatencies.stage7 = Date.now() - s7Start;
    updateStage("stage7", { status: "complete", output: runtime });

    const totalLatency = Date.now() - pipelineStart;
    const finalStatus = repairCount > 0 ? "repaired" : "success";

    const finalJson = {
      ...currentSchemas,
      repair_log: repairLog,
      validation_status: finalStatus === "repaired" ? "repaired" : "valid"
    };

    // Update PipelineRun record
    await PipelineRun.update(runId, {
      ir_output: JSON.stringify(stage1.output),
      architecture_output: JSON.stringify(stage2.output),
      ui_schema: JSON.stringify(currentSchemas.ui_schema),
      api_schema: JSON.stringify(currentSchemas.api_schema),
      db_schema: JSON.stringify(currentSchemas.db_schema),
      auth_schema: JSON.stringify(currentSchemas.auth_schema),
      dependency_graph: JSON.stringify(stage4.dependency_graph),
      validation_report: JSON.stringify(stage4),
      repair_log: JSON.stringify(repairLog),
      final_json: JSON.stringify(finalJson),
      runtime_files: JSON.stringify(runtime),
      assumptions: JSON.stringify(currentSchemas.assumptions || []),
      repair_count: repairCount,
      stage_latencies: JSON.stringify(stageLatencies),
      total_latency_ms: totalLatency,
      status: finalStatus
    });

    return {
      success: true,
      runId,
      finalJson,
      runtime,
      stageLatencies,
      totalLatency,
      repairCount,
      status: finalStatus,
      dependencyGraph: stage4.dependency_graph
    };
  } catch (err) {
    const totalLatency = Date.now() - pipelineStart;
    if (runId) {
      await PipelineRun.update(runId, {
        status: "failed",
        failure_type: err.message?.slice(0, 500),
        total_latency_ms: totalLatency,
        stage_latencies: JSON.stringify(stageLatencies)
      });
    }
    throw err;
  }
}