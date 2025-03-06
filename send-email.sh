#!/bin/bash

# Download Swaks - SMTP command-line testing tool
curl http://www.jetmore.org/john/code/swaks/files/swaks-20130209.0/swaks -o swaks

# Set the permissions for the script so you can run it
chmod +x swaks

# Set up email parameters
MAILGUN_DOMAIN="otakupos.com"  # Replace with your actual Mailgun domain
MAILGUN_USER="postmaster@${MAILGUN_DOMAIN}"
MAILGUN_PASSWORD="3kh9umujora5"  # Replace with your actual Mailgun password
RECIPIENT="$1"  # First argument is the recipient email
SUBJECT="$2"    # Second argument is the subject
BODY="$3"       # Third argument is the email body

# Check if recipient is provided
if [ -z "$RECIPIENT" ]; then
  echo "Error: Recipient email is required"
  echo "Usage: ./send-email.sh recipient@example.com \"Subject\" \"Email body\""
  exit 1
fi

# Set default values if not provided
if [ -z "$SUBJECT" ]; then
  SUBJECT="Receipt from One Piece Bar & Tapas"
fi

if [ -z "$BODY" ]; then
  BODY="Thank you for your visit to One Piece Bar & Tapas!"
fi

# Send the email using Swaks
./swaks --auth \
  --server smtp.mailgun.org \
  --au "$MAILGUN_USER" \
  --ap "$MAILGUN_PASSWORD" \
  --to "$RECIPIENT" \
  --h-Subject: "$SUBJECT" \
  --body "$BODY"

# Check if email was sent successfully
if [ $? -eq 0 ]; then
  echo "Email sent successfully to $RECIPIENT"
else
  echo "Failed to send email to $RECIPIENT"
fi