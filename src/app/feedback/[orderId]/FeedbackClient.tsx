
"use client";

import React, { useEffect } from 'react';
import type { TrackingLink, Feedback } from '@/types';

interface FeedbackClientProps {
  order: TrackingLink;
  existingFeedback: Feedback[];
}

export function FeedbackClient({ order, existingFeedback }: FeedbackClientProps) {
  // Determine if the form should be shown or the thank you message
  const showThankYou = existingFeedback && existingFeedback.length > 0;

  useEffect(() => {
    // If feedback already exists, immediately hide form and show thank you message
    // This handles the client-side logic to prevent re-submission attempts.
    if (showThankYou) {
      const form = document.getElementById('feedback-form');
      const thankYou = document.getElementById('thank-you-message');
      if (form) form.style.display = 'none';
      if (thankYou) thankYou.style.display = 'block';
    }
  }, [showThankYou]);

  // The full HTML structure is now in the layout. This component only renders the body content.
  const formHtml = `
    <div id="feedback-form" class="feedback-card space-y-4">
        <div class="text-center">
            <h1 class="text-xl sm:text-2xl font-bold text-gray-800">আপনার মতামত দিন</h1>
            <p class="text-gray-500 mt-1 text-sm">আপনার অভিজ্ঞতা আমাদের কাছে মূল্যবান।</p>
        </div>

        <!-- 1. Product Quality -->
        <div class="feedback-section pb-6" data-question="প্রোডাক্ট কোয়ালিটি">
            <label class="block text-base font-semibold text-gray-700 mb-3">১. প্রোডাক্ট কোয়ালিটি (Product Quality)</label>
            <div class="star-rating flex items-center justify-center space-x-2" data-value="0">
                <span class="star" data-rating="1"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
                <span class="star" data-rating="2"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
                <span class="star" data-rating="3"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
                <span class="star" data-rating="4"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
                <span class="star" data-rating="5"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
            </div>
        </div>

        <!-- 2. Design Satisfaction -->
        <div class="feedback-section pb-6" data-question="ডিজাইন স্যাটিসফ্যাকশন">
            <label class="block text-base font-semibold text-gray-700 mb-3">২. ডিজাইন স্যাটিসফ্যাকশন (Design Satisfaction)</label>
            <div class="option-group grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 text-center text-sm">
                <div class="option p-3 rounded-lg whitespace-nowrap" data-value="একেবারেই না">একেবারেই না</div>
                <div class="option p-3 rounded-lg whitespace-nowrap" data-value="মাঝারি">মাঝারি</div>
                <div class="option p-3 rounded-lg whitespace-nowrap" data-value="ভালো">ভালো</div>
                <div class="option p-3 rounded-lg whitespace-nowrap" data-value="খুব ভালো">খুব ভালো</div>
                <div class="option p-3 rounded-lg whitespace-nowrap" data-value="অসাধারণ">অসাধারণ</div>
            </div>
        </div>
        
        <!-- 3. Printing Quality -->
        <div class="feedback-section pb-6" data-question="প্রিন্টিং কোয়ালিটি">
            <label class="block text-base font-semibold text-gray-700 mb-3">৩. প্রিন্টিং কোয়ালিটি (Printing Quality)</label>
            <div class="star-rating flex items-center justify-center space-x-2" data-value="0">
                 <span class="star" data-rating="1"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
                <span class="star" data-rating="2"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
                <span class="star" data-rating="3"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
                <span class="star" data-rating="4"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
                <span class="star" data-rating="5"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>
            </div>
        </div>

        <!-- 4. Delivery Time -->
        <div class="feedback-section pb-6" data-question="ডেলিভারি টাইম">
            <label class="block text-base font-semibold text-gray-700 mb-3">৪. ডেলিভারি টাইম (Delivery Time)</label>
            <div class="option-group grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center text-sm">
                <div class="option p-3 rounded-lg whitespace-nowrap" data-value="সময়ের অনেক দেরি">অনেক দেরি</div>
                <div class="option p-3 rounded-lg whitespace-nowrap" data-value="সামান্য দেরি">সামান্য দেরি</div>
                <div class="option p-3 rounded-lg whitespace-nowrap" data-value="সময়মতো">সময়মতো</div>
                <div class="option p-3 rounded-lg whitespace-nowrap" data-value="সময়ের আগেই">সময়ের আগেই</div>
            </div>
        </div>

        <!-- 5. Customer Service -->
        <div class="feedback-section pb-6" data-question="কাস্টমার সার্ভিস">
            <label class="block text-base font-semibold text-gray-700 mb-3">৫. কাস্টমার সার্ভিস (Customer Service)</label>
            <div class="emoji-group flex items-center justify-around">
                <span class="emoji" data-value="খারাপ" title="খারাপ">👎</span>
                <span class="emoji" data-value="মাঝারি" title="মাঝারি">😐</span>
                <span class="emoji" data-value="ভালো" title="ভালো">🙂</span>
                <span class="emoji" data-value="অসাধারণ" title="অসাধারণ">😍</span>
            </div>
        </div>
        
        <!-- Open Feedback -->
        <div class="feedback-section pt-4" data-question="ওপেন ফিডব্যাক">
            <label for="open-feedback" class="block text-base font-semibold text-gray-700 mb-3">৬. ওপেন ফিডব্যাক (ঐচ্ছিক)</label>
            <textarea id="open-feedback" rows="4" class="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition" placeholder="আপনার বিস্তারিত মতামত এখানে লিখুন..."></textarea>
        </div>

        <!-- Submit Button -->
        <div class="pt-4">
            <button id="submit-btn" class="submit-btn w-full text-white font-bold py-3 px-4 rounded-lg text-base">
                মতামত জমা দিন
            </button>
        </div>
    </div>

    <div id="thank-you-message" class="hidden feedback-card w-full max-w-lg p-8 text-center">
        <div class="mx-auto bg-green-100 rounded-full h-20 w-20 flex items-center justify-center">
            <svg class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mt-4">ধন্যবাদ!</h2>
        <p class="text-gray-600 mt-2">আপনার মূল্যবান মতামত সফলভাবে জমা হয়েছে।</p>
    </div>
  `;
  return <div dangerouslySetInnerHTML={{ __html: formHtml }} />;
}
