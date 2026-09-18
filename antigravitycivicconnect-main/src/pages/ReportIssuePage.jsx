import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Send, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Navbar from "../components/layout/Navbar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import FileUpload from "../components/report/FileUpload.jsx";
import LocationPicker from "../components/report/LocationPicker.jsx";
import AIPredictionPanel from "../components/report/AIPredictionPanel.jsx";
import api from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { emailService } from "../services/emailService.js";

const CATEGORIES = ["Roads", "Water", "Electricity", "Garbage", "Drainage", "Health", "Transport", "Public Safety"];

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ description: "", email: "" });
  const [files, setFiles] = useState([]);
  const [location, setLocation] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState(false);
  
  const { user } = useAuth();



  // Real AI diagnostic analysis whenever user enters text or attaches media
  useEffect(() => {
    if (!form.description || form.description.length < 5) {
      setPrediction(null);
      setAnalyzing(false);
      return;
    }

    let active = true;
    const debounceTimer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const formData = new FormData();
        formData.append("description", form.description);
        if (files.length > 0 && files[0].file) {
          formData.append("file", files[0].file);
        }

        const { data } = await api.post("/ai/preview-diagnostics", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (!active) return;

        const textPred = data.textPrediction || {};
        const visionPred = data.visionPrediction || {};
        const topDept = textPred.department || "Municipal Services";
        const topConf = textPred.confidence || 0.5;

        setPrediction({
          department: topDept,
          category: topDept,
          textConfidence: topConf,
          confidence: Math.round(topConf * 100),
          visionTopDetection: visionPred.top_detection,
          visionDetections: visionPred.detections || [],
          hasImage: files.length > 0,
          mode: topConf >= 0.85 ? "AUTO" : "SUPERVISED",
        });
      } catch (err) {
        console.warn("AI preview diagnostics unavailable:", err.message);
      } finally {
        if (active) setAnalyzing(false);
      }
    }, 600);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
    };
  }, [form.description, files.length]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.description) {
      setError("Please provide a description of the issue.");
      return;
    }

    const finalEmail = form.email.trim() || user?.email;
    if (!finalEmail) {
      setError("An email address is required to track your complaint. Please provide one below or log in.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("description", form.description);
      payload.append("email", finalEmail);

      if (location) {
        payload.append("lat", location.lat);
        payload.append("lng", location.lng);
      }
      if (user?.id || user?.uid) {
        payload.append("userId", user.id || user.uid);
      }
      if (user?.name) {
        payload.append("userName", user.name);
      }
      files.forEach((f) => payload.append("media", f.file));

      const { data } = await api.post("/submit-complaint", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const issue = data.complaint;

      // Trigger EmailJS
      const emailVariables = {
        user_name: issue.userName || "User",
        user_email: issue.userEmail || finalEmail,
        email: issue.userEmail || finalEmail, // EmailJS expects the recipient address here
        complaint_id: issue.referenceId,
        issue_title: issue.issueTitle || issue.title,
        category: issue.category,
        location: issue.location ? `${issue.location.lat}, ${issue.location.lng}` : "Not provided",
        submission_date: new Date(issue.createdAt).toLocaleString(),
        status: issue.status
      };

      const emailSuccess = await emailService.sendComplaintConfirmation(emailVariables);
      
      if (!emailSuccess) {
        setEmailError(true);
      }

      setSubmitted(issue);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your report. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-6 pt-32 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-3xl p-10 max-w-md text-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={30} className="text-emerald-400" />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2">Report submitted</h2>
            <p className="text-slate-400 text-sm mb-6">
              Your reference number is{" "}
              <span className="text-cyan-300 font-mono">{submitted.referenceId}</span>. You can
              track its progress any time.
            </p>
            {emailError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-start gap-2 bg-yellow-500/10 border border-yellow-400/30 text-yellow-300 text-sm rounded-xl px-4 py-3 text-left"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>Complaint submitted successfully, but confirmation email could not be sent.</p>
              </motion.div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button to="/track" variant="secondary">
                Track this report
              </Button>
              <Button to="/">Back home</Button>
            </div>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-6 pt-32 pb-20 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display font-bold text-4xl tracking-tight mb-2">Report an issue</h1>
          <p className="text-slate-400 mb-10">
            Give us the details — our AI routes it to the right department automatically.
          </p>

          <form onSubmit={handleSubmit} className="glass-strong rounded-3xl p-7 sm:p-9">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-400/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-6"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}

            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-400 mb-2">Description</label>
              <textarea
                name="description"
                rows={4}
                placeholder="Describe what you see, when you noticed it, and anything else that might help. Our AI will automatically categorize and title it."
                value={form.description}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
              />
            </div>

            <div className="mb-5">
              <Input
                label="Email Address (for tracking)"
                name="email"
                type="email"
                placeholder={`Leave blank to use ${user?.email}`}
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="mb-7">
              <FileUpload files={files} setFiles={setFiles} label="Photos or videos" />
              <AIPredictionPanel analyzing={analyzing} prediction={prediction} />
            </div>

            <div className="mb-8">
              <LocationPicker location={location} setLocation={setLocation} />
            </div>

            <Button type="submit" icon={Send} className="w-full py-3.5" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit report"}
            </Button>
          </form>
        </motion.div>
      </div>
      <Footer />
    </>
  );
}
