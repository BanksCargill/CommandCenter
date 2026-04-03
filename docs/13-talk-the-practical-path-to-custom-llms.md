# The Practical Path to Custom LLMs

**Event:** RVATech Data Summit 2026

---

## Notes

Fine-tuning LLMs on personal journal entries to mimic writing style
3000+ journal entries used as training data
Models pulled from Hugging Face — llama, Gemma, others tested
Apple M4 with 32GB RAM — no GPU parallelization due to unified memory constraints
Six hour training run with exception clauses to save artifacts mid-run

### Key Techniques
- LoRA (Low-Rank Adaptation) — freeze base model weights, bolt on adapters
- Synthetic data generation from journal entries using a local LLM to create instruction/response pairs
- NLP-oriented cleanup + PII scrubbing before fine-tuning

### Evaluation
- ROUGE-L and semantic similarity as objective metrics
- Subjective evaluation — reading outputs for voice consistency and coherence
- Llama performed well; Gemma showed inconsistencies in voice and grammar
- Smaller 2B parameter model was faster at inference despite lower quality ceiling

### Practical Takeaways
- Many real-world use cases do not require frontier models — local fine-tuned LLMs often suffice
- RAG + fine-tuning hybrid is appropriate for domains like retail e-commerce
- Fine-tuning works best in static domains (clinical, legal); less stable in fast-moving ones (finance)
- Context window size is a real constraint — leave computational overhead or training will crash

---

## Key Takeaways

- **LoRA is the practical entry point for fine-tuning on consumer hardware** — freezing base weights and training only the adapters dramatically reduces memory and compute requirements, making a 10B parameter model trainable on a 32GB machine.
- **Synthetic data generation is the critical preprocessing step** — raw journal entries alone are not enough; instruction synthesis using a local LLM to reformat entries into prompt/response pairs is what makes fine-tuning effective.
- **The smaller model won on practicality** — the 2B parameter model ran faster at inference and was sufficient for the summarization task, reinforcing the "butter knife, not chainsaw" principle.
- **Unified memory is both the enabler and the constraint** — Apple Silicon makes local fine-tuning accessible, but memory overshoot causes crashes; parallelization was not possible in this setup.
- **Voice consistency is the hardest problem** — objective metrics like ROUGE-L can look good while subjective voice coherence fails; iterative fine-tuning and holdout evaluation are both necessary.
- **The pipeline is extensible** — the speaker positioned this as a starting point, not a finished product; the same stack can scale to enterprise problems with more data and resources.

---

## AI Summary

### Overview

The talk covered a two-part practical demonstration of fine-tuning open-source LLMs on personal journal data to produce a model that writes in the speaker's own style. The speaker walked through the full pipeline from data preparation through evaluation, running entirely on local consumer hardware.

---

### Core Concepts

**Fine-Tuning vs. RAG**
- Fine-tuning adjusts model weights to capture style, domain knowledge, or behavior
- RAG retrieves relevant content at inference time without modifying weights
- Hybrid approaches (RAG + fine-tuned model) are appropriate for domains needing both style and current knowledge

**LoRA (Low-Rank Adaptation)**
- Freezes base model weights entirely
- Adds small trainable adapter layers that capture the target style or domain
- Dramatically reduces compute and memory requirements vs. full fine-tuning
- Adapters can be swapped without retraining the base model

**Synthetic Data Generation**
- Raw journal entries are not in instruction/response format that LLMs expect
- A local LLM is used to convert entries into synthetic prompt/response pairs
- Data is scrubbed for PII and cleaned with NLP preprocessing before use

---

### Evaluation Approach

| Method | Description |
|--------|-------------|
| ROUGE-L | Measures overlap between generated and reference text |
| Semantic similarity | Embedding-based comparison of meaning |
| Subjective review | Human reading for voice consistency and coherence |
| Holdout data | Reserved entries not used in training, used to test generalization |

Llama outperformed Gemma on voice consistency. The 2B parameter model was faster at inference and sufficient for summarization tasks.

---

### Practical Constraints Encountered

- No GPU parallelization — unified memory overshoot caused system crashes
- Six-hour training run required exception handling to save intermediate artifacts
- Context window size limits how much of a journal entry can be processed at once
- Gradient explosion is a risk during training; regularization and careful hyperparameter tuning are required

---

### Application Domains Discussed

- **Clinical medicine** — static domain, high value for fine-tuning on specialized terminology
- **Legal** — similar to clinical; domain-specific language benefits from fine-tuning
- **Finance** — fast-moving domain; fine-tuning on static data goes stale quickly
- **Retail e-commerce** — hybrid RAG + fine-tune approach recommended

---

### Transcript & Resources

- Part 1 Transcript: https://otter.ai/u/4AHTFx0pt2l8NkGM2p40mc2wgWo
- Part 2 Transcript: https://otter.ai/u/E1aNw5HKMmz6eRR1iIuSNJYyh8U

---

### Action Items

- [ ] Speaker to share fine-tuning Python code and stack details with interested attendees
- [ ] Speaker to share setup artifacts for the fine-tuning pipeline and synthetic prompt generation

---

### Talk Outline

1. **Introduction** — personal journal dataset, motivation for style mimicry
2. **LLM Primer** — token prediction, neural network architecture, forward/back propagation
3. **Model Growth Context** — GPT (2019) to trillion-parameter models today
4. **Fine-Tuning Approach** — LoRA, frozen weights, adapter layers
5. **Data Preparation** — scrubbing PII, NLP cleanup, synthetic instruction generation
6. **Training Run** — six hours, no parallelization, artifact saving, gradient explosion risk
7. **Evaluation** — ROUGE-L, semantic similarity, subjective voice review
8. **Results** — llama vs. Gemma, 2B vs. 10B model tradeoffs
9. **Application Domains** — clinical, legal, finance, retail e-commerce
10. **Live Demo** — summarization app running on local Mac, inference time comparison
11. **Community and Next Steps** — Hugging Face ecosystem, code sharing, extensibility