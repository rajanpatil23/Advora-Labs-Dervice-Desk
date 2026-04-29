import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2 } from "lucide-react";
import { csatApi } from "@/lib/api/csat";
import { toast } from "sonner";

// Public survey page - the link sent in the post-resolution email lands here.
// Route: /survey/:ticketNumber?token=...
export default function PublicSurvey() {
  const { ticketNumber = "TKT-DEMO" } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [score, setScore] = useState<number | null>(null);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // pre-fill if score in query (?score=5 from email click-through)
    const s = params.get("score");
    if (s) setScore(Number(s));
  }, [params]);

  const submit = () => {
    if (!score) { toast.error("Please pick a rating"); return; }
    csatApi.submitResponse({
      surveyId: "sv-default",
      ticketId: ticketNumber,
      ticketNumber,
      score,
      comment: comment.trim() || undefined,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/30">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-xl font-semibold">Thank you!</h1>
            <p className="text-sm text-muted-foreground">Your feedback on {ticketNumber} has been recorded.</p>
            <Button variant="outline" onClick={() => nav("/")}>Done</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>How did we do?</CardTitle>
          <CardDescription>Your support request <span className="font-mono">{ticketNumber}</span> was resolved. Please rate your experience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setScore(n)}
                className="transition-transform hover:scale-110"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star className={`h-10 w-10 ${(hover || score || 0) >= n ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Anything to add? <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="What went well or what could improve?" />
          </div>
          <Button onClick={submit} className="w-full">Submit feedback</Button>
        </CardContent>
      </Card>
    </div>
  );
}
