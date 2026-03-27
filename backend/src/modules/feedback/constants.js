'use strict';

const RESPONSE_TYPES = ['concept_match', 'ambiguous_match', 'no_exact_match'];

const FEEDBACK_OPTIONS_BY_RESPONSE_TYPE = {
  concept_match: ['clear', 'unclear', 'wrong_concept'],
  ambiguous_match: ['found_right_one', 'still_not_right'],
  no_exact_match: ['expected', 'should_exist'],
};

module.exports = {
  FEEDBACK_OPTIONS_BY_RESPONSE_TYPE,
  RESPONSE_TYPES,
};

