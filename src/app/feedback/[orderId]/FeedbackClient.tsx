
"use client";

import React from 'react';
import type { TrackingLink } from '@/types';

interface FeedbackClientProps {
  order: TrackingLink;
}

export function FeedbackClient({ order }: FeedbackClientProps) {
  // This component now renders a self-contained HTML page
  // with embedded styles and scripts to match the provided reference design.
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>মতামত ফর্ম</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            body {
                font-family: 'Hind Siliguri', sans-serif;
                background: linear-gradient(to top right, #fff7ed, #fef2f2); /* Light orange/red gradient */
            }
            .feedback-card {
                background-color: white;
                border-radius: 20px; /* More rounded corners */
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
                transition: all 0.3s ease-in-out;
                animation: fadeIn 0.7s ease-in-out;
            }
            .star-rating .star {
                color: #d1d5db; /* Gray color for inactive stars */
                cursor: pointer;
                transition: color 0.2s, transform 0.2s;
            }
            .star-rating .star:hover,
            .star-rating .star.selected {
                color: #f59e0b; /* Amber color for active/hovered stars */
                transform: scale(1.1);
            }
            .option-group .option {
                border: 2px solid #e5e7eb;
                transition: all 0.2s;
                cursor: pointer;
            }
            .option-group .option:hover {
                border-color: #fb923c; /* Orange-400 */
                background-color: #fff7ed; /* Orange-50 */
            }
            .option-group .option.selected {
                border-color: #f97316; /* Orange-500 */
                background-color: #ffedd5; /* Orange-100 */
                color: #9a3412; /* Orange-800 */
                font-weight: 600;
            }
            .emoji-group .emoji {
                cursor: pointer;
                transition: transform 0.2s, opacity 0.2s;
                opacity: 0.6;
                font-size: 2.5rem; /* Larger emojis */
            }
            .emoji-group .emoji:hover {
                transform: scale(1.15);
                opacity: 1;
            }
            .emoji-group .emoji.selected {
                transform: scale(1.2);
                opacity: 1;
            }
            .submit-btn {
                background: linear-gradient(to right, #f97316, #ef4444); /* Orange to Red gradient */
                transition: all 0.3s ease;
            }
            .submit-btn:hover {
                box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4); /* Orange shadow */
                transform: translateY(-2px);
            }
            .feedback-section {
                border-bottom: 1px solid #f3f4f6;
            }
            .feedback-section:last-child {
                border-bottom: none;
            }
        </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-4">

        <div id="feedback-form" class="feedback-card w-full max-w-2xl p-6 sm:p-8 space-y-6">
            <div class="text-center">
                <h1 class="text-2xl sm:text-3xl font-bold text-gray-800">আপনার মতামত দিন</h1>
                <p class="text-gray-500 mt-1">আপনার অভিজ্ঞতা আমাদের কাছে মূল্যবান।</p>
            </div>

            <!-- 1. Product Quality -->
            <div class="feedback-section pb-6" data-question="প্রোডাক্ট কোয়ালিটি">
                <label class="block text-lg font-semibold text-gray-700 mb-3">১. প্রোডাক্ট কোয়ালিটি (Product Quality)</label>
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
                <label class="block text-lg font-semibold text-gray-700 mb-3">২. ডিজাইন স্যাটিসফ্যাকশন (Design Satisfaction)</label>
                <div class="option-group grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 text-center">
                    <div class="option p-3 rounded-lg" data-value="একেবারেই না">একেবারেই না</div>
                    <div class="option p-3 rounded-lg" data-value="মাঝারি">মাঝারি</div>
                    <div class="option p-3 rounded-lg" data-value="ভালো">ভালো</div>
                    <div class="option p-3 rounded-lg" data-value="খুব ভালো">খুব ভালো</div>
                    <div class="option p-3 rounded-lg" data-value="অসাধারণ">অসাধারণ</div>
                </div>
            </div>
            
            <!-- 3. Printing Quality -->
            <div class="feedback-section pb-6" data-question="প্রিন্টিং কোয়ালিটি">
                <label class="block text-lg font-semibold text-gray-700 mb-3">৩. প্রিন্টিং কোয়ালিটি (Printing Quality)</label>
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
                <label class="block text-lg font-semibold text-gray-700 mb-3">৪. ডেলিভারি টাইম (Delivery Time)</label>
                <div class="option-group grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center">
                    <div class="option p-3 rounded-lg" data-value="সময়ের অনেক দেরি">অনেক দেরি</div>
                    <div class="option p-3 rounded-lg" data-value="সামান্য দেরি">সামান্য দেরি</div>
                    <div class="option p-3 rounded-lg" data-value="সময়মতো">সময়মতো</div>
                    <div class="option p-3 rounded-lg" data-value="সময়ের আগেই">সময়ের আগেই</div>
                </div>
            </div>

            <!-- 5. Customer Service -->
            <div class="feedback-section pb-6" data-question="কাস্টমার সার্ভিস">
                <label class="block text-lg font-semibold text-gray-700 mb-3">৫. কাস্টমার সার্ভিস (Customer Service)</label>
                <div class="emoji-group flex items-center justify-around">
                    <span class="emoji" data-value="খারাপ" title="খারাপ">👎</span>
                    <span class="emoji" data-value="মাঝারি" title="মাঝারি">😐</span>
                    <span class="emoji" data-value="ভালো" title="ভালো">🙂</span>
                    <span class="emoji" data-value="অসাধারণ" title="অসাধারণ">😍</span>
                </div>
            </div>
            
            <!-- Open Feedback -->
            <div class="feedback-section pt-4" data-question="ওপেন ফিডব্যাক">
                <label for="open-feedback" class="block text-lg font-semibold text-gray-700 mb-3">৬. ওপেন ফিডব্যাক (ঐচ্ছিক)</label>
                <textarea id="open-feedback" rows="4" class="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition" placeholder="আপনার বিস্তারিত মতামত এখানে লিখুন..."></textarea>
            </div>

            <!-- Submit Button -->
            <div class="pt-4">
                <button id="submit-btn" class="submit-btn w-full text-white font-bold py-3 px-4 rounded-lg text-lg">
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
            <h2 class="text-3xl font-bold text-gray-800 mt-4">ধন্যবাদ!</h2>
            <p class="text-gray-600 mt-2 text-lg">আপনার মূল্যবান মতামত সফলভাবে জমা হয়েছে।</p>
        </div>

        <script>
            document.addEventListener('DOMContentLoaded', () => {
                // Star rating functionality
                const starContainers = document.querySelectorAll('.star-rating');
                starContainers.forEach(container => {
                    const stars = container.querySelectorAll('.star');
                    stars.forEach(star => {
                        star.addEventListener('mouseover', () => {
                            const rating = parseInt(star.dataset.rating);
                            highlightStars(stars, rating);
                        });
                        star.addEventListener('mouseout', () => {
                            const currentRating = parseInt(container.dataset.value);
                            highlightStars(stars, currentRating);
                        });
                        star.addEventListener('click', () => {
                            const rating = parseInt(star.dataset.rating);
                            container.dataset.value = rating;
                            highlightStars(stars, rating);
                        });
                    });
                });

                function highlightStars(stars, rating) {
                    stars.forEach(s => {
                        if (parseInt(s.dataset.rating) <= rating) {
                            s.classList.add('selected');
                        } else {
                            s.classList.remove('selected');
                        }
                    });
                }

                // Option group functionality
                const optionGroups = document.querySelectorAll('.option-group');
                optionGroups.forEach(group => {
                    const options = group.querySelectorAll('.option');
                    options.forEach(option => {
                        option.addEventListener('click', () => {
                            options.forEach(o => o.classList.remove('selected'));
                            option.classList.add('selected');
                        });
                    });
                });

                // Emoji group functionality
                const emojiGroups = document.querySelectorAll('.emoji-group');
                emojiGroups.forEach(group => {
                    const emojis = group.querySelectorAll('.emoji');
                    emojis.forEach(emoji => {
                        emoji.addEventListener('click', () => {
                            emojis.forEach(e => e.classList.remove('selected'));
                            emoji.classList.add('selected');
                        });
                    });
                });

                // Form submission
                const submitBtn = document.getElementById('submit-btn');
                submitBtn.addEventListener('click', () => {
                    const feedbackData = {};
                    
                    // Get star ratings
                    starContainers.forEach(container => {
                        const question = container.closest('.feedback-section').dataset.question;
                        const value = container.dataset.value;
                        feedbackData[question] = parseInt(value, 10) > 0 ? \`\${value} out of 5\` : 'Not rated';
                    });
                    
                    // Get option selections
                    optionGroups.forEach(group => {
                        const question = group.closest('.feedback-section').dataset.question;
                        const selectedOption = group.querySelector('.option.selected');
                        feedbackData[question] = selectedOption ? selectedOption.dataset.value : 'Not selected';
                    });

                    // Get emoji selections
                    emojiGroups.forEach(group => {
                        const question = group.closest('.feedback-section').dataset.question;
                        const selectedEmoji = group.querySelector('.emoji.selected');
                        feedbackData[question] = selectedEmoji ? selectedEmoji.dataset.value : 'Not selected';
                    });
                    
                    // Get open feedback
                    const openFeedback = document.getElementById('open-feedback').value;
                    feedbackData['ওপেন ফিডব্যাক'] = openFeedback || 'No feedback provided';
                    
                    console.log('--- আপনার ফিডব্যাক ---');
                    console.log(feedbackData);

                    // Hide form and show thank you message
                    document.getElementById('feedback-form').classList.add('hidden');
                    document.getElementById('thank-you-message').classList.remove('hidden');
                });
            });
        </script>

    </body>
    </html>
  `;
  // Using dangerouslySetInnerHTML to render the complete HTML page structure.
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
