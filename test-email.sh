#!/bin/bash

# This script tests sending an email using the send-email.sh script

# Check if recipient is provided
if [ -z "$1" ]; then
  echo "Error: Recipient email is required"
  echo "Usage: ./test-email.sh recipient@example.com"
  exit 1
fi

# Set up test email parameters
RECIPIENT="$1"
SUBJECT="Test Email from One Piece Bar & Tapas"
BODY="This is a test email from One Piece Bar & Tapas POS system. If you received this email, the email service is working correctly."

# Make sure send-email.sh is executable
chmod +x send-email.sh

# Send the test email
./send-email.sh "$RECIPIENT" "$SUBJECT" "$BODY"