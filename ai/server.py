"""
SR&ED Report AI - Inference API Server
Serves the fine-tuned Axolotl model for T661 report generation.
Falls back to template-based generation if no model is available.
"""

import os
import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# ============================================
# Configuration
# ============================================
PORT = 5000
MODEL_PATH = os.environ.get("SRED_MODEL_PATH", "./ai/output/sred-mistral-7b-qlora/merged")
USE_GPU = os.environ.get("SRED_USE_GPU", "true").lower() == "true"

# ============================================
# Model Loading (lazy - only when needed)
# ============================================
model = None
tokenizer = None
model_loaded = False
model_error = None

SYSTEM_PROMPT = """You are an expert SR&ED (Scientific Research and Experimental Development) report writer specializing in CRA T661 form project descriptions. You generate compliant, detailed, and technically precise descriptions for Lines 242, 244, and 246. Always use proper SR&ED terminology: technological advancement, technological uncertainty, systematic investigation, hypothesis, competent professional, standard practice."""


def load_model():
    """Load the fine-tuned model. Returns True if successful."""
    global model, tokenizer, model_loaded, model_error

    if model_loaded:
        return True

    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch

        print(f"Loading model from {MODEL_PATH}...")

        if not os.path.exists(MODEL_PATH):
            model_error = f"Model not found at {MODEL_PATH}. Run training first or set SRED_MODEL_PATH."
            print(f"WARNING: {model_error}")
            return False

        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)

        load_kwargs = {
            "trust_remote_code": True,
            "torch_dtype": torch.float16,
        }

        if USE_GPU and torch.cuda.is_available():
            load_kwargs["device_map"] = "auto"
            print(f"Loading on GPU: {torch.cuda.get_device_name(0)}")
        else:
            load_kwargs["device_map"] = "cpu"
            print("Loading on CPU (slower inference)")

        model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, **load_kwargs)
        model.eval()
        model_loaded = True
        print("Model loaded successfully!")
        return True

    except ImportError:
        model_error = "transformers/torch not installed. Install with: pip install torch transformers"
        print(f"WARNING: {model_error}")
        return False
    except Exception as e:
        model_error = str(e)
        print(f"ERROR loading model: {model_error}")
        return False


def generate_with_model(prompt, max_tokens=2048, temperature=0.7):
    """Generate text using the loaded model."""
    import torch

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    input_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(input_text, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            top_p=0.9,
            do_sample=True,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id,
        )

    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    return response.strip()


# ============================================
# Template-based fallback generation
# ============================================

def generate_with_templates(data):
    """Generate T661 descriptions using structured templates when no AI model is available."""

    section = data.get("section", "all")
    project = data.get("project", {})

    title = project.get("title", "the project")
    field = project.get("field", "technology")
    objective = project.get("objective", "")
    baseline = project.get("baseline", "")
    advancement = project.get("advancement", "")
    why_not_standard = project.get("whyNotStandard", "")
    uncertainties = project.get("uncertainties", "")
    why_uncertain = project.get("whyUncertain", "")
    hypotheses = project.get("hypotheses", "")
    experiments = project.get("experiments", "")
    iterations = project.get("iterations", "")
    results = project.get("results", "")
    personnel = project.get("personnel", "")

    output = {}

    if section in ("all", "242"):
        line242 = "LINE 242 - SCIENTIFIC OR TECHNOLOGICAL ADVANCEMENT\n\n"

        if objective:
            line242 += f"The objective of this project was to achieve a technological advancement in the field of {field} through {objective.rstrip('.')}.\n\n"
        else:
            line242 += f"The objective of this project was to achieve a technological advancement in the field of {field}.\n\n"

        if baseline:
            line242 += f"At the outset of this project, the state of technology was as follows: {baseline}\n\n"

        if advancement:
            line242 += f"The technological advancement sought was {advancement.rstrip('.')}.\n\n"

        if why_not_standard:
            line242 += f"This advancement could not be achieved through standard practice because {why_not_standard.rstrip('.')}. A competent professional in the field would not have been able to achieve this advancement using existing knowledge, publicly available information, or standard industry methodologies."

        output["line242"] = line242.strip()

    if section in ("all", "244"):
        line244 = "LINE 244 - SCIENTIFIC OR TECHNOLOGICAL UNCERTAINTY\n\n"
        line244 += "At the commencement of this project, the following technological uncertainties existed that could not be resolved by a competent professional in the field using standard practice, publicly available knowledge, or existing technical literature:\n\n"

        if uncertainties:
            unc_lines = [u.strip() for u in uncertainties.split("\n") if u.strip()]
            for i, u in enumerate(unc_lines, 1):
                cleaned = u.lstrip("0123456789.-) ").strip()
                if not cleaned.lower().startswith("it was uncertain"):
                    cleaned = f"it was uncertain {cleaned}"
                line244 += f"{i}. {cleaned[0].upper()}{cleaned[1:]}\n\n"

        if why_uncertain:
            line244 += f"These uncertainties could not be resolved by a competent professional through standard practice because {why_uncertain.rstrip('.')}.\n\n"

        if hypotheses:
            line244 += "To address these uncertainties, the following hypotheses were formulated:\n\n"
            hyp_lines = [h.strip() for h in hypotheses.split("\n") if h.strip()]
            for i, h in enumerate(hyp_lines, 1):
                cleaned = h.lstrip("Hh0123456789.-):) ").strip()
                line244 += f"H{i}: {cleaned}\n"

        output["line244"] = line244.strip()

    if section in ("all", "246"):
        line246 = "LINE 246 - WORK PERFORMED\n\n"

        if personnel:
            line246 += f"A systematic investigation was conducted by a team of {personnel} to address the technological uncertainties identified above.\n\n"
        else:
            line246 += "A systematic investigation was conducted to address the technological uncertainties identified above.\n\n"

        if experiments:
            line246 += "The following experiments and tests were designed and performed as part of the systematic investigation:\n\n"
            exp_lines = [e.strip() for e in experiments.split("\n") if e.strip()]
            for e in exp_lines:
                cleaned = e.lstrip("-•* ").strip()
                line246 += f"• {cleaned}\n"
            line246 += "\n"

        if iterations:
            line246 += "Based on experimental results, the following iterations and modifications were made:\n\n"
            iter_lines = [i.strip() for i in iterations.split("\n") if i.strip()]
            for it in iter_lines:
                cleaned = it.lstrip("-•* ").strip()
                line246 += f"• {cleaned}\n"
            line246 += "\n"

        if results:
            line246 += f"The systematic investigation yielded the following results and conclusions: {results}\n\n"

        line246 += "The work described above constitutes a systematic investigation carried out in a field of science or technology by means of experiment or analysis."

        output["line246"] = line246.strip()

    return output


def generate_with_ai(data):
    """Generate using the AI model with a structured prompt."""
    section = data.get("section", "all")
    project = data.get("project", {})

    section_map = {
        "242": "Line 242 (Scientific or Technological Advancement)",
        "244": "Line 244 (Scientific or Technological Uncertainty)",
        "246": "Line 246 (Work Performed)",
        "all": "all three sections (Lines 242, 244, and 246)",
    }

    prompt = f"Write a T661 {section_map.get(section, 'complete report')} for the following project:\n\n"
    prompt += f"Project Title: {project.get('title', 'N/A')}\n"
    prompt += f"Industry: {project.get('field', 'N/A')}\n"

    if project.get("objective"):
        prompt += f"Objective: {project['objective']}\n"
    if project.get("baseline"):
        prompt += f"Baseline Technology: {project['baseline']}\n"
    if project.get("advancement"):
        prompt += f"Advancement Sought: {project['advancement']}\n"
    if project.get("whyNotStandard"):
        prompt += f"Why Not Standard Practice: {project['whyNotStandard']}\n"
    if project.get("uncertainties"):
        prompt += f"Uncertainties: {project['uncertainties']}\n"
    if project.get("whyUncertain"):
        prompt += f"Why Uncertain: {project['whyUncertain']}\n"
    if project.get("hypotheses"):
        prompt += f"Hypotheses: {project['hypotheses']}\n"
    if project.get("experiments"):
        prompt += f"Experiments: {project['experiments']}\n"
    if project.get("iterations"):
        prompt += f"Iterations: {project['iterations']}\n"
    if project.get("results"):
        prompt += f"Results: {project['results']}\n"
    if project.get("personnel"):
        prompt += f"Personnel: {project['personnel']}\n"

    max_tokens = data.get("max_tokens", 2048)
    temperature = data.get("temperature", 0.7)

    response = generate_with_model(prompt, max_tokens=max_tokens, temperature=temperature)

    # Try to split into sections if generating all
    output = {}
    if section == "all":
        if "LINE 242" in response and "LINE 244" in response and "LINE 246" in response:
            parts = response.split("LINE 244")
            output["line242"] = parts[0].strip()
            remaining = "LINE 244" + parts[1] if len(parts) > 1 else ""
            parts2 = remaining.split("LINE 246")
            output["line244"] = parts2[0].strip()
            output["line246"] = ("LINE 246" + parts2[1]).strip() if len(parts2) > 1 else ""
        else:
            output["line242"] = response
    else:
        output[f"line{section}"] = response

    return output


# ============================================
# HTTP Request Handler
# ============================================

class SREDHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/health":
            self._send_json({
                "status": "ok",
                "model_loaded": model_loaded,
                "model_error": model_error,
                "mode": "ai" if model_loaded else "template",
            })
        elif parsed.path == "/":
            self._send_json({
                "name": "SR&ED Report AI Server",
                "version": "1.0.0",
                "endpoints": {
                    "GET /health": "Server and model status",
                    "POST /generate": "Generate T661 descriptions",
                    "POST /improve": "Improve existing T661 text",
                },
            })
        else:
            self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON"}, 400)
            return

        if parsed.path == "/generate":
            self._handle_generate(data)
        elif parsed.path == "/improve":
            self._handle_improve(data)
        else:
            self._send_json({"error": "Not found"}, 404)

    def _handle_generate(self, data):
        """Generate T661 descriptions from project details."""
        try:
            if model_loaded:
                result = generate_with_ai(data)
                mode = "ai"
            else:
                result = generate_with_templates(data)
                mode = "template"

            self._send_json({
                "success": True,
                "mode": mode,
                "sections": result,
            })
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _handle_improve(self, data):
        """Improve existing T661 text."""
        text = data.get("text", "")
        section = data.get("section", "242")

        if not text:
            self._send_json({"error": "No text provided"}, 400)
            return

        try:
            if model_loaded:
                prompt = f"Improve the following T661 Line {section} description to be more CRA-compliant. Fix any weak language, add missing required elements, and ensure proper SR&ED terminology is used. Keep the technical content accurate but strengthen the SR&ED compliance.\n\nOriginal text:\n{text}\n\nImproved version:"
                improved = generate_with_model(prompt, max_tokens=2048, temperature=0.5)
                self._send_json({"success": True, "mode": "ai", "improved": improved})
            else:
                # Template-based improvement: add missing SR&ED phrases
                improved = self._template_improve(text, section)
                self._send_json({"success": True, "mode": "template", "improved": improved})
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _template_improve(self, text, section):
        """Basic template-based text improvement."""
        improvements = []
        text_lower = text.lower()

        if section == "242":
            if "technological advancement" not in text_lower:
                improvements.append("Consider adding: 'The technological advancement sought was...'")
            if "standard practice" not in text_lower and "competent professional" not in text_lower:
                improvements.append("Consider adding: 'This could not be achieved through standard practice because...'")
            if "state of technology" not in text_lower and "baseline" not in text_lower:
                improvements.append("Consider adding: 'At the outset of this project, the state of technology was...'")

        elif section == "244":
            if "it was uncertain" not in text_lower:
                improvements.append("Frame uncertainties as: 'It was uncertain whether...'")
            if "competent professional" not in text_lower:
                improvements.append("Add: 'A competent professional could not resolve these through standard practice because...'")
            if "hypothes" not in text_lower:
                improvements.append("Consider adding hypotheses: 'H1: ...'")

        elif section == "246":
            if "systematic" not in text_lower:
                improvements.append("Add: 'A systematic investigation was conducted...'")
            if "experiment" not in text_lower and "test" not in text_lower:
                improvements.append("Describe specific experiments and tests performed")
            if "iteration" not in text_lower and "modif" not in text_lower:
                improvements.append("Describe iterations/modifications made based on results")

        result = text
        if improvements:
            result += "\n\n--- SUGGESTED IMPROVEMENTS ---\n"
            for imp in improvements:
                result += f"• {imp}\n"

        return result

    def _send_json(self, data, status=200):
        self.send_response(status)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        print(f"[SRED-API] {args[0]} {args[1]} {args[2]}")


# ============================================
# Main
# ============================================

def main():
    # Try to load the fine-tuned model
    print("=" * 50)
    print("SR&ED Report AI Server")
    print("=" * 50)

    load_model()

    if model_loaded:
        print(f"Mode: AI (fine-tuned model)")
    else:
        print(f"Mode: Template-based (no model loaded)")
        if model_error:
            print(f"Reason: {model_error}")
        print("The server will use structured templates for report generation.")
        print("To enable AI mode, train a model with Axolotl and set SRED_MODEL_PATH.")

    print(f"\nStarting server on http://localhost:{PORT}")
    print(f"Endpoints:")
    print(f"  GET  /health   - Server status")
    print(f"  POST /generate - Generate T661 descriptions")
    print(f"  POST /improve  - Improve existing text")
    print()

    server = HTTPServer(("0.0.0.0", PORT), SREDHandler)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.server_close()


if __name__ == "__main__":
    main()
