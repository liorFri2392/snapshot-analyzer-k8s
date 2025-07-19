"""
Debug Logger for Best Practices Analysis

This module provides a simple logging utility for debugging 
the best practices analysis functionality.
"""

import os
import sys
import logging
from datetime import datetime

# Configure the logger for both file and console output
log_dir = "logs"
if not os.path.exists(log_dir):
    try:
        os.makedirs(log_dir)
    except Exception as e:
        print(f"Warning: Could not create log directory: {e}")

log_file = os.path.join(log_dir, "best_practices_debug.log")

# Configure a basic file handler that appends to the log file
try:
    file_handler = logging.FileHandler(log_file, mode="a")
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(file_format)
    
    # Configure a console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_format = logging.Formatter('%(levelname)s: %(message)s')
    console_handler.setFormatter(console_format)
    
    # Get the logger
    debug_logger = logging.getLogger("best_practices_debug")
    debug_logger.setLevel(logging.DEBUG)
    
    # Remove any existing handlers to avoid duplicate logs
    for handler in debug_logger.handlers[:]:
        debug_logger.removeHandler(handler)
    
    # Add the handlers to the logger
    debug_logger.addHandler(file_handler)
    debug_logger.addHandler(console_handler)
    
except Exception as e:
    print(f"Warning: Could not configure logger: {e}")
    debug_logger = logging.getLogger("best_practices_debug")
    debug_logger.setLevel(logging.DEBUG)

def debug_log(message: str, level: str = "INFO"):
    """
    Log a debug message with timestamp.
    
    Args:
        message: The message to log
        level: The log level (INFO, WARNING, ERROR, DEBUG)
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if level.upper() == "ERROR":
            debug_logger.error(f"{message}")
        elif level.upper() == "WARNING":
            debug_logger.warning(f"{message}")
        elif level.upper() == "DEBUG":
            debug_logger.debug(f"{message}")
        else:
            debug_logger.info(f"{message}")
            
        # Ensure the log is immediately visible
        sys.stdout.flush()
        
    except Exception as e:
        print(f"Error logging: {e}")
        print(f"{timestamp} - {level}: {message}")
        sys.stdout.flush() 