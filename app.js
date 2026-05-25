const { createApp, ref } = Vue

const API = "http://localhost:8000"

createApp({
  setup() {
    const question = ref(
      "How does team size influence the balance between disruptive innovation and developmental research in science and technology?"
    )

    const useOptimization = ref(false)
    const numCandidates = ref(1)
    const numRounds = ref(1)

    const loading = ref(false)
    const error = ref("")

    const preview = ref("")
    const figures = ref([])
    const downloadUrl = ref("")
    const reward = ref(null)
    const cacheBust = ref(Date.now())

    const agents = ref([
      { name: "Planner Agent", status: "pending" },
      { name: "Analysis Agent", status: "pending" },
      { name: "Figure Generation Agent", status: "pending" },
      { name: "Writer Agent", status: "pending" },
      { name: "Reviewer Agent", status: "pending" },
      { name: "GRPO Optimizer Agent", status: "pending" },
      { name: "Final Report", status: "pending" },
    ])

    function resetAgents() {
      agents.value.forEach(a => a.status = "pending")
    }


    async function runPipeline() {
        loading.value = true
        error.value = ""
        preview.value = ""
        figures.value = []
        downloadUrl.value = ""
        reward.value = null
        cacheBust.value = Date.now()
        resetAgents()

        try {
            const res = await fetch(`${API}/run-stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: question.value,
                use_optimization: useOptimization.value,
                num_candidates: numCandidates.value,
                num_rounds: numRounds.value,
            }),
            })

            if (!res.ok || !res.body) {
            throw new Error(`Backend error: ${res.status}`)
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder("utf-8")
            let buffer = ""

            while (true) {
            const { value, done } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const events = buffer.split("\n\n")
            buffer = events.pop()

            for (const event of events) {
                const line = event.trim()
                if (!line.startsWith("data:")) continue

                const data = JSON.parse(line.replace(/^data:\s*/, ""))

                if (data.type === "status") {
                const agent = agents.value.find(a => a.name === data.agent)
                if (agent) agent.status = data.status
                }

                if (data.type === "result") {
                preview.value = data.preview || ""
                figures.value = data.figures || []
                downloadUrl.value = data.download_url || ""
                reward.value = data.reward ?? null
                cacheBust.value = Date.now()
                }

                if (data.type === "error") {
                throw new Error(data.message)
                }

                if (data.type === "done") {
                loading.value = false
                }
            }
            }
        } catch (e) {
            error.value = String(e.message || e)
        } finally {
            loading.value = false
        }
    }

    return {
      API,
      question,
      useOptimization,
      numCandidates,
      numRounds,
      loading,
      error,
      preview,
      figures,
      downloadUrl,
      reward,
      cacheBust,
      agents,
      runPipeline,
    }
  }
}).mount("#app")