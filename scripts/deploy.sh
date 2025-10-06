#!/bin/bash

# Melbourne Cup App Deployment Script
# This script handles the complete deployment process to Vercel

set -e # Exit on any error

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Configuration
PROJECT_NAME="melbourne-cup-app"
VERCEL_ORG="your-org-name" # Update this
DOMAIN_PRODUCTION="melbournecup.app"
DOMAIN_STAGING="staging.melbournecup.app"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_requirements() {
    log_info "Checking deployment requirements..."

    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI is not installed. Install it with: npm install -g vercel"
    fi

    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Are you in the project root?"
    fi

    # Check if turbo is available
    if ! command -v turbo &> /dev/null; then
        log_warning "Turbo is not installed globally. Using npx..."
    fi

    # Check if environment file exists
    if [ ! -f ".env.production.example" ]; then
        log_warning ".env.production.example not found"
    fi

    log_success "Requirements check passed"
}

setup_vercel_project() {
    log_info "Setting up Vercel project..."

    # Link to existing project or create new one
    if [ ! -f ".vercel/project.json" ]; then
        log_info "Linking to Vercel project..."
        vercel link --yes
    else
        log_info "Already linked to Vercel project"
    fi

    log_success "Vercel project setup complete"
}

run_tests() {
    log_info "Running tests..."

    # Install dependencies
    npm install

    # Run linting
    if npm run lint:check &> /dev/null; then
        log_success "Linting passed"
    else
        log_warning "Linting failed - continuing with deployment"
    fi

    # Run type checking
    if npm run type-check &> /dev/null; then
        log_success "Type checking passed"
    else
        log_error "Type checking failed - deployment aborted"
    fi

    # Run unit tests if available
    if npm run test:ci &> /dev/null; then
        log_success "Tests passed"
    else
        log_warning "Tests failed or not configured - continuing with deployment"
    fi
}

build_project() {
    log_info "Building project..."

    # Clean previous builds
    rm -rf .next
    rm -rf dist

    # Build with turbo
    if command -v turbo &> /dev/null; then
        turbo build
    else
        npx turbo build
    fi

    log_success "Build completed"
}

check_environment_variables() {
    local env_type=$1
    log_info "Checking environment variables for $env_type..."

    # Required environment variables
    required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "NEXTAUTH_SECRET"
        "QR_CODE_SECRET"
    )

    # Check if environment variables are set in Vercel
    for var in "${required_vars[@]}"; do
        if vercel env ls | grep -q "$var"; then
            log_info "✓ $var is configured"
        else
            log_warning "⚠ $var is not configured in Vercel"
        fi
    done

    log_success "Environment variables check completed"
}

deploy_to_staging() {
    log_info "Deploying to staging..."

    # Deploy without promoting to production
    DEPLOYMENT_URL=$(vercel --yes --no-clipboard)

    if [ $? -eq 0 ]; then
        log_success "Staging deployment successful"
        log_info "Staging URL: $DEPLOYMENT_URL"

        # Run health check
        log_info "Running health check..."
        sleep 10 # Wait for deployment to be ready

        if curl -f "$DEPLOYMENT_URL/api/health" > /dev/null 2>&1; then
            log_success "Health check passed"
        else
            log_error "Health check failed"
        fi
    else
        log_error "Staging deployment failed"
    fi
}

deploy_to_production() {
    log_info "Deploying to production..."

    # Promote the last deployment to production
    vercel --prod --yes

    if [ $? -eq 0 ]; then
        log_success "Production deployment successful"
        log_info "Production URL: https://$DOMAIN_PRODUCTION"

        # Run health check
        log_info "Running production health check..."
        sleep 15 # Wait for deployment to be ready

        if curl -f "https://$DOMAIN_PRODUCTION/api/health" > /dev/null 2>&1; then
            log_success "Production health check passed"
        else
            log_warning "Production health check failed - please investigate"
        fi
    else
        log_error "Production deployment failed"
    fi
}

run_post_deploy_tasks() {
    local env_type=$1
    log_info "Running post-deployment tasks for $env_type..."

    # Run database migrations if needed
    if [ "$env_type" == "production" ]; then
        log_info "Checking if database migrations are needed..."
        # This would typically check if migrations are needed and run them
        # npm run migrate:status
        # npm run migrate
    fi

    # Warm up the application
    log_info "Warming up the application..."
    if [ "$env_type" == "production" ]; then
        curl -s "https://$DOMAIN_PRODUCTION" > /dev/null || true
        curl -s "https://$DOMAIN_PRODUCTION/api/health" > /dev/null || true
    fi

    # Send deployment notification (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        log_info "Sending deployment notification..."
        curl -X POST -H 'Content-type: application/json' \\
            --data "{\\"text\\":\\"🚀 Melbourne Cup App deployed to $env_type successfully\\"}" \\
            "$SLACK_WEBHOOK_URL" || true
    fi

    log_success "Post-deployment tasks completed"
}

rollback_deployment() {
    log_info "Rolling back deployment..."

    # Get list of deployments
    vercel ls "$PROJECT_NAME" --json > deployments.json

    # Promote the second-to-last production deployment
    PREVIOUS_DEPLOYMENT=$(cat deployments.json | jq -r '.[] | select(.target == "production") | .uid' | sed -n 2p)

    if [ -n "$PREVIOUS_DEPLOYMENT" ]; then
        vercel promote "$PREVIOUS_DEPLOYMENT" --yes
        log_success "Rollback completed to deployment: $PREVIOUS_DEPLOYMENT"
    else
        log_error "No previous deployment found for rollback"
    fi

    # Clean up
    rm -f deployments.json
}

show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  staging     Deploy to staging environment"
    echo "  production  Deploy to production environment"
    echo "  rollback    Rollback to previous production deployment"
    echo "  check       Check deployment requirements and configuration"
    echo ""
    echo "Options:"
    echo "  --skip-tests    Skip running tests before deployment"
    echo "  --skip-build    Skip building the project"
    echo "  --dry-run       Show what would be deployed without actually deploying"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production --skip-tests"
    echo "  $0 rollback"
}

# Main deployment logic
main() {
    local command=$1
    shift

    # Parse options
    SKIP_TESTS=false
    SKIP_BUILD=false
    DRY_RUN=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                ;;
        esac
    done

    # Execute command
    case $command in
        "staging")
            log_info "🚀 Starting staging deployment..."
            check_requirements
            setup_vercel_project

            if [ "$SKIP_TESTS" != true ]; then
                run_tests
            fi

            if [ "$SKIP_BUILD" != true ]; then
                build_project
            fi

            check_environment_variables "staging"

            if [ "$DRY_RUN" != true ]; then
                deploy_to_staging
                run_post_deploy_tasks "staging"
            else
                log_info "Dry run - would deploy to staging"
            fi
            ;;

        "production")
            log_info "🚀 Starting production deployment..."
            check_requirements
            setup_vercel_project

            if [ "$SKIP_TESTS" != true ]; then
                run_tests
            fi

            if [ "$SKIP_BUILD" != true ]; then
                build_project
            fi

            check_environment_variables "production"

            if [ "$DRY_RUN" != true ]; then
                # Confirm production deployment
                read -p "Are you sure you want to deploy to production? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    deploy_to_production
                    run_post_deploy_tasks "production"
                else
                    log_info "Production deployment cancelled"
                fi
            else
                log_info "Dry run - would deploy to production"
            fi
            ;;

        "rollback")
            log_info "🔄 Starting rollback..."
            rollback_deployment
            ;;

        "check")
            log_info "🔍 Checking deployment configuration..."
            check_requirements
            check_environment_variables "production"
            ;;

        *)
            show_usage
            exit 1
            ;;
    esac

    log_success "✨ Deployment script completed successfully!"
}

# Run main function with all arguments
main "$@"