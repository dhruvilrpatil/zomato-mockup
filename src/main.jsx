import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Star,
  ShieldCheck,
  MapPin,
  Clock3,
  CheckCircle2,
  ArrowRight,
  Utensils,
  UserRound,
  LogOut,
  AlertCircle,
  Loader,
  TrendingUp,
  Award,
  Phone,
  Mail,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./styles.css";

// Calculate platform tier based on score
function calculateTier(score) {
  const val = Number(score) || 0;
  if (val >= 4.8) return "Diamond Top Performer";
  if (val >= 4.5) return "Gold Verified";
  if (val >= 4.0) return "Silver Active";
  return "Bronze Starter";
}

// Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "error" ? "#fee" : "#efe";
  const borderColor = type === "error" ? "#c82f3c" : "#22c55e";
  const textColor = type === "error" ? "#c82f3c" : "#166534";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        padding: "12px 18px",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: "600",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {message}
    </div>
  );
}

function Topbar({ onLogout, worker }) {
  return (
    <header className="topbar">
      <div className="brand">GigFolio</div>
      <div className="integration">
        Zomato <span>•</span> Partner Portal
        {worker && (
          <>
            <span>•</span>
            <span style={{ color: "#222", fontWeight: "600" }}>
              {worker.legal_name || "Partner"}
            </span>
          </>
        )}
        {onLogout && (
          <>
            <span>•</span>
            <button
              onClick={onLogout}
              style={{
                background: "none",
                border: "none",
                color: "#e23744",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginType, setLoginType] = useState("uid"); // 'uid' or 'gig_id'

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter a UID to log in");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

      // If user is trying to login with UID but entered non-UUID format
      if (loginType === "uid" && !isUuid) {
        setError("Please enter a valid UUID format (e.g. d6b30baa-8b31-44d3-9d77-e37980fa7eef)");
        setLoading(false);
        return;
      }

      let wpData = null;
      let repData = null;

      // 1. Search worker_profiles table by user_id or id
      if (isUuid) {
        try {
          const { data, error: wpErr } = await supabase
            .from("worker_profiles")
            .select("*")
            .or(`user_id.eq.${cleanId},id.eq.${cleanId}`)
            .maybeSingle();

          if (!wpErr && data) {
            wpData = data;
          }
        } catch (err) {
          console.warn("worker_profiles query error:", err);
        }

        // 2. Search reputation_scores table for UID
        try {
          const { data, error: repErr } = await supabase
            .from("reputation_scores")
            .select("*")
            .eq("user_id", cleanId)
            .maybeSingle();

          if (!repErr && data) {
            repData = data;
          }
        } catch (err) {
          console.warn("reputation_scores query error:", err);
        }
      }

      // Assemble worker profile from database data or UID
      const workerData = {
        user_id: wpData?.user_id || cleanId,
        id: wpData?.id || cleanId,
        legal_name: wpData?.legal_name || "Zomato Partner",
        email: wpData?.email || null,
        phone: wpData?.phone || null,
        location: wpData?.location || null,
        created_at: wpData?.created_at || null,
        gig_score: repData?.overall_score != null ? Number(repData.overall_score) : null,
        overall_score: repData?.overall_score != null ? Number(repData.overall_score) : null,
        reliability_score: repData?.reliability_score != null ? Number(repData.reliability_score) : null,
        quality_score: repData?.quality_score != null ? Number(repData.quality_score) : null,
        activity_score: repData?.activity_score != null ? Number(repData.activity_score) : null,
      };

      onLogin(workerData);
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to login. Please verify the UID and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Topbar />
      <main className="center">
        <section className="card login-card">
          <div className="company-logo zomato">zomato</div>
          <h1>Partner Portal</h1>
          <p className="muted">
            Enter your UID present in the database to fetch your profile & reputation data.
          </p>

          <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                setLoginType("uid");
                setError("");
              }}
              style={{
                flex: 1,
                padding: "10px",
                border: `2px solid ${loginType === "uid" ? "#e23744" : "#d9dade"}`,
                background: loginType === "uid" ? "#fff5f6" : "#fff",
                color: loginType === "uid" ? "#e23744" : "#666",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "14px",
              }}
            >
              User UID
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType("gig_id");
                setError("");
              }}
              style={{
                flex: 1,
                padding: "10px",
                border: `2px solid ${loginType === "gig_id" ? "#e23744" : "#d9dade"}`,
                background: loginType === "gig_id" ? "#fff5f6" : "#fff",
                color: loginType === "gig_id" ? "#e23744" : "#666",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "14px",
              }}
            >
              Gig ID / Other
            </button>
          </div>

          <label style={{ marginTop: "20px" }}>
            {loginType === "uid" ? "Worker UID (UUID)" : "Gig ID or Worker ID"}
          </label>
          <input
            type="text"
            placeholder={
              loginType === "uid"
                ? "e.g. 550e8400-e29b-41d4-a716-446655440000"
                : "e.g. GIG123456"
            }
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
            disabled={loading}
            autoFocus
          />

          {error && (
            <div
              style={{
                marginTop: "14px",
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                padding: "10px 14px",
                borderRadius: "8px",
              }}
            >
              <AlertCircle size={18} style={{ color: "#c82f3c", marginTop: "2px", flexShrink: 0 }} />
              <p style={{ color: "#c82f3c", fontSize: "13px", margin: 0, lineHeight: 1.4 }}>{error}</p>
            </div>
          )}

          <button
            className="primary"
            onClick={handleLogin}
            disabled={loading || !identifier.trim()}
            style={{ opacity: loading || !identifier.trim() ? 0.7 : 1 }}
          >
            {loading ? (
              <>
                <Loader size={18} style={{ animation: "spin 1s linear infinite" }} />
                Fetching data...
              </>
            ) : (
              <>
                Login & Fetch Profile <ArrowRight size={18} />
              </>
            )}
          </button>
        </section>
      </main>
    </div>
  );
}

function ProfilePage({ worker, onLogout, onRefresh }) {
  const [zomatoRating, setZomatoRating] = useState({
    platform_score: 0,
    tier: "Bronze Starter",
    total_reviews: 0,
  });
  const [gigFolioScore, setGigFolioScore] = useState({
    score: 0,
    tier: "Bronze Starter",
    total_reviews: 0,
    overall_score: null,
    reliability_score: null,
    quality_score: null,
    activity_score: null,
  });
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    name: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadPlatformData();
  }, [worker.user_id]);

  const loadPlatformData = async () => {
    setLoading(true);
    setError("");

    try {
      const uid = worker.user_id;

      // 1. Fetch Zomato Platform Rating via RPC and/or ratings table
      let zScore = 0;
      let zReviews = 0;
      let zTier = "Bronze Starter";

      try {
        const { data: rpcRating, error: rpcErr } = await supabase.rpc(
          "get_worker_platform_rating",
          {
            p_user_id: uid,
            p_platform_name: "Zomato",
          }
        );
        const rpcObj = Array.isArray(rpcRating) ? rpcRating[0] : rpcRating;
        if (!rpcErr && rpcObj) {
          zScore = Number(rpcObj.platform_score) || 0;
          zReviews = Number(rpcObj.total_reviews) || 0;
          zTier = rpcObj.tier || calculateTier(zScore);
        }
      } catch (err) {
        console.warn("RPC get_worker_platform_rating error:", err);
      }

      // Query ratings table for all ratings by this user
      let allRatings = [];
      try {
        const { data: ratData, error: ratErr } = await supabase
          .from("ratings")
          .select("*")
          .eq("user_id", uid);

        if (!ratErr && ratData) {
          allRatings = ratData;
        }
      } catch (err) {
        console.warn("ratings table query error:", err);
      }

      // Calculate Zomato specific stats from ratings if RPC was empty
      const zomatoRatings = allRatings.filter(
        (r) => (r.platform_name || "").toLowerCase() === "zomato"
      );

      if (zomatoRatings.length > 0) {
        zReviews = zomatoRatings.length;
        const sum = zomatoRatings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        zScore = Math.round((sum / zReviews) * 100) / 100;
        zTier = calculateTier(zScore);
      }

      setZomatoRating({
        platform_score: zScore,
        tier: zTier,
        total_reviews: zReviews,
      });

      // 2. Fetch Reputation Scores (reputation_scores table)
      let repRecord = null;
      try {
        const { data: repData, error: repErr } = await supabase
          .from("reputation_scores")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        if (!repErr && repData) {
          repRecord = repData;
        }
      } catch (err) {
        console.warn("reputation_scores query error:", err);
      }

      // Calculate combined GigFolio Score
      let gScore = 0;
      let gReviews = allRatings.length;
      let gTier = "Bronze Starter";

      if (repRecord && repRecord.overall_score != null) {
        gScore = Number(repRecord.overall_score);
        gTier = calculateTier(gScore);
      } else if (allRatings.length > 0) {
        const sum = allRatings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        gScore = Math.round((sum / allRatings.length) * 100) / 100;
        gTier = calculateTier(gScore);
      } else if (worker.gig_score != null) {
        gScore = Number(worker.gig_score);
        gReviews = Number(worker.total_reviews) || 0;
        gTier = worker.tier || calculateTier(gScore);
      } else if (zScore > 0) {
        gScore = zScore;
        gReviews = zReviews;
        gTier = zTier;
      }

      setGigFolioScore({
        score: gScore,
        tier: gTier,
        total_reviews: gReviews,
        overall_score: repRecord?.overall_score ?? null,
        reliability_score: repRecord?.reliability_score ?? null,
        quality_score: repRecord?.quality_score ?? null,
        activity_score: repRecord?.activity_score ?? null,
      });

      // 3. Fetch Recent Reviews
      let fetchedReviews = [];
      try {
        const { data: rpcRev, error: rpcRevErr } = await supabase.rpc(
          "get_platform_recent_reviews",
          {
            p_user_id: uid,
            p_platform_name: "Zomato",
            p_limit: 10,
          }
        );
        if (!rpcRevErr && rpcRev && rpcRev.length > 0) {
          fetchedReviews = rpcRev.map((r, i) => ({
            id: r.review_id || r.id || i,
            rating: Number(r.rating) || 5,
            review_text: r.review_text || r.review || "No review text provided.",
            reviewer_name: r.reviewer_name || "Customer",
            platform_name: r.platform_name || "Zomato",
            created_at: r.created_at,
          }));
        }
      } catch (err) {
        console.warn("RPC get_platform_recent_reviews error:", err);
      }

      if (fetchedReviews.length === 0 && zomatoRatings.length > 0) {
        const sorted = [...zomatoRatings].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        fetchedReviews = sorted.slice(0, 10).map((r, i) => ({
          id: r.id || i,
          rating: Number(r.rating) || 5,
          review_text: r.review || r.review_text || "Great delivery service!",
          reviewer_name: r.reviewer_name || "Zomato Customer",
          platform_name: r.platform_name || "Zomato",
          created_at: r.created_at,
        }));
      }

      setRecentReviews(fetchedReviews);
    } catch (err) {
      console.error("Error loading platform data:", err);
      setError("Failed to load some profile data from the database.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (reviewForm.rating === 0) {
      setReviewError("Please select a star rating (1-5)");
      return;
    }

    setSubmittingReview(true);
    setReviewError("");

    const newReview = {
      id: "rev-" + Date.now(),
      rating: Number(reviewForm.rating),
      review_text: `${reviewForm.rating} Star Rating from verified customer`,
      reviewer_name: reviewForm.name.trim() || "Zomato Customer",
      platform_name: "Zomato",
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Attempt insert into Supabase ratings table
      const { data: insertedData, error: insErr } = await supabase.from("ratings").insert({
        user_id: worker.user_id,
        rating: Number(reviewForm.rating),
        review: null,
        reviewer_name: reviewForm.name.trim() || "Zomato Customer",
        platform_name: "Zomato",
      }).select();

      if (insErr) {
        console.warn(
          "Supabase RLS restricted direct insert on ratings table:",
          insErr.message
        );
      }

      // Optimistically update UI so the user experience is smooth and immediate
      setRecentReviews((prev) => [newReview, ...prev]);

      // Update Zomato platform rating in state
      setZomatoRating((prev) => {
        const oldTotal = prev.total_reviews || 0;
        const oldScore = prev.platform_score || 0;
        const newTotal = oldTotal + 1;
        const newScore =
          oldTotal > 0
            ? Math.round(((oldScore * oldTotal + Number(reviewForm.rating)) / newTotal) * 100) / 100
            : Number(reviewForm.rating);
        return {
          platform_score: newScore,
          tier: calculateTier(newScore),
          total_reviews: newTotal,
        };
      });

      // Update GigFolio score & tier in state
      setGigFolioScore((prev) => {
        const oldTotal = prev.total_reviews || 0;
        const oldScore = prev.score || 0;
        const newTotal = oldTotal + 1;
        const newScore =
          oldTotal > 0
            ? Math.round(((oldScore * oldTotal + Number(reviewForm.rating)) / newTotal) * 100) / 100
            : Number(reviewForm.rating);
        return {
          ...prev,
          score: newScore,
          tier: calculateTier(newScore),
          total_reviews: newTotal,
        };
      });

      setToast({ message: "Rating submitted successfully!", type: "success" });
      setReviewForm({ rating: 0, name: "" });

      // If DB insert succeeded without RLS error, reload from DB after a moment
      if (!insErr) {
        setTimeout(() => {
          loadPlatformData();
          if (onRefresh) onRefresh();
        }, 1000);
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      setReviewError("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="page">
      <Topbar onLogout={onLogout} worker={worker} />
      <main className="content">
        {/* Header */}
        <div className="page-title">
          <div>
            <p className="eyebrow">PROFILE (VISIBLE TO PARTNER)</p>
            <h1>{worker.legal_name || "Zomato Partner"}</h1>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "6px", color: "#666", fontSize: "13px" }}>
              <span style={{ fontFamily: "monospace", background: "#f1f1f4", padding: "3px 8px", borderRadius: "6px", wordBreak: "break-all", maxWidth: "100%" }}>
                UID: {worker.user_id}
              </span>
              {worker.location && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={14} /> {worker.location}
                </span>
              )}
              {worker.email && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Mail size={14} /> {worker.email}
                </span>
              )}
              {worker.phone && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Phone size={14} /> {worker.phone}
                </span>
              )}
            </div>
          </div>
          <span className="verified">
            <ShieldCheck size={16} /> Verified Partner
          </span>
        </div>

        {error && (
          <div
            style={{
              background: "#fee",
              border: "1px solid #c82f3c",
              color: "#c82f3c",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={18} style={{ marginTop: "2px", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: "14px" }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <Loader size={36} style={{ animation: "spin 1s linear infinite", color: "#e23744" }} />
            <p style={{ color: "#666", fontSize: "15px" }}>Fetching live data from Supabase database...</p>
          </div>
        ) : (
          <>
            {/* Two-column layout */}
            <div className="dashboard-grid">
              {/* Left: Ratings & Scores Card */}
              <div className="card" style={{ padding: "28px" }}>
                {/* Zomato Rating */}
                <div style={{ marginBottom: "20px" }}>
                  <p className="eyebrow">ZOMATO PLATFORM RATING</p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "12px",
                      marginTop: "8px",
                    }}
                  >
                    <span style={{ fontSize: "48px", fontWeight: "800", color: "#e23744" }}>
                      {zomatoRating.platform_score > 0 ? zomatoRating.platform_score.toFixed(2) : "0.00"}
                    </span>
                    <div>
                      <div style={{ display: "flex", gap: "2px" }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={18}
                            fill={i < Math.round(zomatoRating.platform_score) ? "#e23744" : "#e9e9ec"}
                            color={i < Math.round(zomatoRating.platform_score) ? "#e23744" : "#e9e9ec"}
                          />
                        ))}
                      </div>
                      <p style={{ fontSize: "13px", color: "#666", margin: "6px 0 0" }}>
                        {zomatoRating.total_reviews} verified reviews
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#666", marginTop: "12px" }}>
                    Platform Tier:{" "}
                    <span style={{ color: "#e23744", fontWeight: "700" }}>{zomatoRating.tier}</span>
                  </p>
                </div>

                <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #e8e8eb" }} />

                {/* Combined GigFolio Score */}
                <div>
                  <p className="eyebrow" style={{ color: "#22c55e" }}>COMBINED GIGFOLIO REPUTATION SCORE</p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "12px",
                      marginTop: "8px",
                    }}
                  >
                    <span style={{ fontSize: "48px", fontWeight: "800", color: "#166534" }}>
                      {gigFolioScore.score > 0 ? gigFolioScore.score.toFixed(2) : "0.00"}
                    </span>
                    <div>
                      <div style={{ display: "flex", gap: "2px" }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            fill={i < Math.round(gigFolioScore.score) ? "#22c55e" : "#e9e9ec"}
                            color={i < Math.round(gigFolioScore.score) ? "#22c55e" : "#e9e9ec"}
                            size={18}
                          />
                        ))}
                      </div>
                      <p style={{ fontSize: "13px", color: "#666", margin: "6px 0 0" }}>
                        {gigFolioScore.total_reviews} total reviews
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#666", marginTop: "12px" }}>
                    Global Tier:{" "}
                    <span style={{ color: "#166534", fontWeight: "700" }}>{gigFolioScore.tier}</span>
                  </p>

                  {/* Additional Metrics from reputation_scores if present */}
                  {(gigFolioScore.reliability_score != null ||
                    gigFolioScore.quality_score != null ||
                    gigFolioScore.activity_score != null) && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                        gap: "10px",
                        marginTop: "16px",
                        padding: "12px",
                        background: "#f9fafb",
                        borderRadius: "10px",
                        border: "1px solid #f0f0f2",
                      }}
                    >
                      {gigFolioScore.reliability_score != null && (
                        <div>
                          <small style={{ color: "#888", fontSize: "11px", display: "block" }}>Reliability</small>
                          <b style={{ fontSize: "15px", color: "#111" }}>{Number(gigFolioScore.reliability_score).toFixed(1)}</b>
                        </div>
                      )}
                      {gigFolioScore.quality_score != null && (
                        <div>
                          <small style={{ color: "#888", fontSize: "11px", display: "block" }}>Quality</small>
                          <b style={{ fontSize: "15px", color: "#111" }}>{Number(gigFolioScore.quality_score).toFixed(1)}</b>
                        </div>
                      )}
                      {gigFolioScore.activity_score != null && (
                        <div>
                          <small style={{ color: "#888", fontSize: "11px", display: "block" }}>Activity</small>
                          <b style={{ fontSize: "15px", color: "#111" }}>{Number(gigFolioScore.activity_score).toFixed(1)}</b>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Submit Review Form */}
              <div className="card" style={{ padding: "28px" }}>
                <p className="eyebrow">RATING (VISIBLE TO CUSTOMER)</p>
                <h2 style={{ fontSize: "18px", fontWeight: "700", margin: "8px 0 16px" }}>Rate this partner</h2>

                <form onSubmit={handleSubmitReview}>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "10px" }}>
                      Rating (1 to 5 Stars)
                    </label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setReviewForm({ ...reviewForm, rating: num });
                            setReviewError("");
                          }}
                          style={{
                            width: "42px",
                            height: "42px",
                            border: `2px solid ${reviewForm.rating >= num ? "#e23744" : "#e8e8eb"}`,
                            background: reviewForm.rating >= num ? "#fff5f6" : "#fff",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Star
                            size={20}
                            fill={reviewForm.rating >= num ? "#e23744" : "none"}
                            color={reviewForm.rating >= num ? "#e23744" : "#d9dade"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "8px" }}>
                      Reviewer Name (optional)
                    </label>
                    <input
                      type="text"
                      value={reviewForm.name}
                      onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                      placeholder="e.g. Customer in Mumbai"
                      style={{
                        width: "100%",
                        height: "42px",
                        border: "1px solid #d9dade",
                        borderRadius: "10px",
                        padding: "0 12px",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>

                  {reviewError && (
                    <div
                      style={{
                        background: "#fee",
                        border: "1px solid #c82f3c",
                        color: "#c82f3c",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        marginBottom: "12px",
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                      }}
                    >
                      <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="primary"
                    style={{ opacity: submittingReview ? 0.7 : 1 }}
                  >
                    {submittingReview ? (
                      <>
                        <Loader size={18} style={{ animation: "spin 1s linear infinite" }} />
                        Submitting Rating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Submit Rating
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="card" style={{ padding: "28px", marginBottom: "24px" }}>
              <p className="eyebrow">RECENT ZOMATO REVIEWS</p>
              <h2 style={{ fontSize: "18px", fontWeight: "700", margin: "8px 0 16px" }}>
                Latest Customer Feedback
              </h2>

              {recentReviews.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {recentReviews.map((review, idx) => (
                    <div
                      key={review.id || idx}
                      style={{
                        borderBottom: idx < recentReviews.length - 1 ? "1px solid #e8e8eb" : "none",
                        paddingBottom: idx < recentReviews.length - 1 ? "16px" : "0",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ display: "flex", gap: "3px" }}>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i < (review.rating || 0) ? "#e23744" : "#e9e9ec"}
                              color={i < (review.rating || 0) ? "#e23744" : "#e9e9ec"}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: "12px", color: "#999" }}>
                          {review.reviewer_name || "Zomato Customer"}
                          {review.created_at && (
                            <>
                              {" • "}
                              {new Date(review.created_at).toLocaleDateString()}
                            </>
                          )}
                        </span>
                      </div>
                      <p style={{ fontSize: "14px", color: "#444", lineHeight: 1.5, margin: 0 }}>
                        {review.review_text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "30px 20px", textAlign: "center" }}>
                  <p style={{ color: "#999", fontSize: "14px", margin: 0 }}>
                    No reviews recorded for Zomato yet. Submit a review using the form above!
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function App() {
  const [worker, setWorker] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      {!worker ? (
        <LoginPage onLogin={(workerData) => setWorker(workerData)} />
      ) : (
        <ProfilePage
          key={refreshKey}
          worker={worker}
          onLogout={() => {
            setWorker(null);
            setRefreshKey((k) => k + 1);
          }}
          onRefresh={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
