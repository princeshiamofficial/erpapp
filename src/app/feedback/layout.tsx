
import type { Metadata } from 'next';
import '../globals.css';
import Script from 'next/script'; // Import the Script component

export const metadata: Metadata = {
  title: 'Feedback - Color Hut',
  description: 'Provide your valuable feedback.',
};

export default function FeedbackLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Meta tags and links are now handled by Next.js metadata and the RootLayout */}
      {/* We can inject necessary scripts and styles directly here */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>
        {`
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* These will apply to the body tag rendered by the root layout */
            body {
                font-family: 'Hind Siliguri', sans-serif;
                background: linear-gradient(to top right, #fff7ed, #fef2f2);
                display: flex;
                justify-content: center;
                min-height: 100vh;
                padding: 2rem 1rem;
            }
            .feedback-card {
                background-color: white;
                border-radius: 20px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
                transition: all 0.3s ease-in-out;
                animation: fadeIn 0.7s ease-in-out;
                width: 100%;
                max-width: 42rem;
                padding: 1.5rem;
                align-self: flex-start;
            }

            @media (min-width: 640px) {
                .feedback-card {
                    padding: 2rem;
                }
            }

            .star-rating .star { color: #d1d5db; cursor: pointer; transition: color 0.2s, transform 0.2s; }
            .star-rating .star:hover, .star-rating .star.selected { color: #f59e0b; transform: scale(1.1); }
            .option-group .option { border: 2px solid #e5e7eb; transition: all 0.2s; cursor: pointer; }
            .option-group .option:hover { border-color: #fb923c; background-color: #fff7ed; }
            .option-group .option.selected { border-color: #f97316; background-color: #ffedd5; color: #9a3412; font-weight: 600; }
            .emoji-group .emoji { cursor: pointer; transition: transform 0.2s, opacity 0.2s; opacity: 0.6; filter: grayscale(80%); font-size: 2.25rem; }
            .emoji-group .emoji:hover { transform: scale(1.15); opacity: 1; filter: grayscale(0%); }
            .emoji-group .emoji.selected { transform: scale(1.2); opacity: 1; filter: grayscale(0%); }
            .submit-btn { background: linear-gradient(to right, #f97316, #ef4444); transition: all 0.3s ease; }
            .submit-btn:hover { box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4); transform: translateY(-2px); }
            .feedback-section { border-bottom: 1px solid #f3f4f6; }
            .feedback-section:last-child { border-bottom: none; }
          `}
      </style>
      <main>{children}</main>
      <Script id="feedback-form-script" strategy="afterInteractive">
          {`
              // Star rating functionality
              const starContainers = document.querySelectorAll('.star-rating');
              starContainers.forEach(container => {
                  const stars = container.querySelectorAll('.star');
                  stars.forEach(star => {
                      star.addEventListener('mouseover', () => {
                          const rating = parseInt(star.dataset.rating, 10);
                          highlightStars(stars, rating);
                      });
                      star.addEventListener('mouseout', () => {
                          const currentRating = parseInt(container.dataset.value, 10);
                          highlightStars(stars, currentRating);
                      });
                      star.addEventListener('click', () => {
                          const rating = parseInt(star.dataset.rating, 10);
                          container.dataset.value = rating;
                          highlightStars(stars, rating);
                      });
                  });
              });

              function highlightStars(stars, rating) {
                  stars.forEach(s => {
                      if (parseInt(s.dataset.rating, 10) <= rating) {
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
              if (submitBtn) {
                  submitBtn.addEventListener('click', () => {
                      const feedbackData = {};
                      let allRequiredAnswered = true;
                      
                      // Get all feedback sections except the optional one
                      const requiredSections = document.querySelectorAll('.feedback-section:not([data-question="ওপেন ফিডব্যাক"])');
                      
                      requiredSections.forEach(section => {
                          const starRating = section.querySelector('.star-rating');
                          const optionGroup = section.querySelector('.option-group');
                          const emojiGroup = section.querySelector('.emoji-group');

                          let isAnswered = false;
                          if (starRating && parseInt(starRating.dataset.value, 10) > 0) {
                              isAnswered = true;
                          } else if (optionGroup && optionGroup.querySelector('.option.selected')) {
                              isAnswered = true;
                          } else if (emojiGroup && emojiGroup.querySelector('.emoji.selected')) {
                              isAnswered = true;
                          }
                          
                          if (!isAnswered) {
                              allRequiredAnswered = false;
                          }
                      });

                      if (!allRequiredAnswered) {
                          alert("Please answer all required questions before submitting.");
                          return;
                      }

                      // Get star ratings
                      starContainers.forEach(container => {
                          const question = container.closest('.feedback-section').dataset.question;
                          const value = parseInt(container.dataset.value, 10);
                          feedbackData[question] = value > 0 ? ('★'.repeat(value) + '☆'.repeat(5 - value) + ' (' + value + '/5)') : 'Not rated';
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

                      const overallRating = parseInt(document.querySelector('[data-question="প্রোডাক্ট কোয়ালিটি"] .star-rating').dataset.value, 10) || 0;
                      
                      const orderId = window.location.pathname.split('/').pop();

                      fetch('/api/feedback', {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                              orderId: orderId,
                              rating: overallRating,
                              feedbackText: JSON.stringify(feedbackData),
                          }),
                      })
                      .then(response => {
                          if (!response.ok) {
                              throw new Error('Network response was not ok');
                          }
                          return response.json();
                      })
                      .then(data => {
                          if (data.success) {
                              document.getElementById('feedback-form').style.display = 'none';
                              document.getElementById('thank-you-message').style.display = 'block';
                          } else {
                              alert('An error occurred: ' + data.error);
                          }
                      })
                      .catch(error => {
                          console.error('Error submitting feedback:', error);
                          alert('An error occurred while submitting your feedback. Please check the console for details.');
                      });
                  });
              }
            `}
        </Script>
        {/* We no longer need the Tailwind CDN script as it's part of the app's build process */}
    </>
  );
}
