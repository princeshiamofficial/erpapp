
"use client";

import React, { useState, FormEvent } from 'react';
import type { TrackingLink } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitFeedbackAction } from './actions';
import { Star, Loader2, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FeedbackClientProps {
  order: TrackingLink;
}

export function FeedbackClient({ order }: FeedbackClientProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await submitFeedbackAction(order.id, rating, feedbackText);

    if (result.success) {
      toast({
        title: "Feedback Submitted!",
        description: "Thank you for your valuable input.",
      });
      setIsSubmitted(true);
    } else {
      toast({
        title: "Submission Failed",
        description: result.error || "Could not submit your feedback. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardContent className="p-10 text-center flex flex-col items-center">
            <PartyPopper className="h-16 w-16 text-primary mb-4" />
            <h2 className="text-2xl font-bold text-foreground">Thank You!</h2>
            <p className="text-muted-foreground mt-2">
                Your feedback has been received. We appreciate you taking the time to help us improve.
            </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Leave Feedback</CardTitle>
        <CardDescription>
          Tell us about your experience with order: <span className="font-mono text-primary">{order.id}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-lg font-semibold">Your Rating *</label>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.div
                  key={star}
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Star
                    className={cn(
                      "h-10 w-10 cursor-pointer transition-colors duration-200",
                      (hoverRating || rating) >= star
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    )}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="feedback-text" className="text-lg font-semibold">Your Comments (Optional)</label>
            <Textarea
              id="feedback-text"
              className="mt-2 min-h-[120px]"
              placeholder="Tell us what you liked or what could be improved..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
