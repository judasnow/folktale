//----------------------------------------------------------------------
//
// This source file is part of the Folktale project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const assertType = require('folktale/helpers/assert-type');
const assertFunction = require('folktale/helpers/assert-function');
const { union, derivations } = require('folktale/adt/union');
const provideAliases = require('folktale/helpers/provide-fantasy-land-aliases');
const adtMethods = require('folktale/helpers/define-adt-methods');
const extend = require('folktale/helpers/extend');
const warnDeprecation = require('folktale/helpers/warn-deprecation');

const { equality, debugRepresentation, serialization } = derivations;


/*~ stability: stable */
const Validation = union('folktale:Validation', {
  /*~
   * type: |
   *   forall a, b: (a) => Validation a b
   */
  Failure(value) { 
    return { value };
  },

  /*~
   * type: |
   *   forall a, b: (b) => Validation a b
   */
  Success(value) { 
    return { value };
  }
}).derive(equality, debugRepresentation, serialization);


const { Success, Failure } = Validation;
const assertValidation = assertType(Validation);


extend(Failure.prototype, {
  /*~
   * isRequired: true
   * type: |
   *   forall a, b: get (Validation a b) => a
   */
  get value() {
    throw new TypeError('`value` can’t be accessed in an abstract instance of Validation.Failure');
  }
});


extend(Success.prototype, {
  /*~
   * isRequired: true
   * type: |
   *   forall a, b: get (Validation a b) => b
   */
  get value() {
    throw new TypeError('`value` can’t be accessed in an abstract instance of Validation.Success');
  }
});


/*~~belongsTo: Validation */
adtMethods(Validation, {
  /*~
   * type: |
   *   forall a, b, c: (Validation a b).((b) => c) => Validation a c
   */
  map: {
    /*~*/
    Failure: function map(transformation) {
      assertFunction('Validation.Failure#map', transformation);
      return this;
    },

    /*~*/
    Success: function map(transformation) {
      assertFunction('Validation.Success#map', transformation);
      return Success(transformation(this.value));
    }
  },


  /*~
   * type: |
   *   forall a, b, c: (Validation (b) => c).(Validation a b) => Validation a c
   */
  apply: {
    /*~*/
    Failure: function apply(aValidation) {
      assertValidation('Failure#apply', aValidation);
      return Failure.hasInstance(aValidation) ? Failure(this.value.concat(aValidation.value))
      :      /* otherwise */                    this;
    },

    /*~*/
    Success: function apply(aValidation) {
      assertValidation('Success#apply', aValidation);
      return Failure.hasInstance(aValidation) ? aValidation
      :      /* otherwise */                    aValidation.map(this.value);
    }
  },

  /*~
   * type: |
   *   forall a, b: (Validation a b).() => b :: throws TypeError
   */
  unsafeGet: {
    /*~*/
    Failure: function unsafeGet() {
      throw new TypeError(`Can't extract the value of a Failure.

    Failure does not contain a normal value - it contains an error.
    You might consider switching from Validation#get to Validation#getOrElse, or some other method
    that is not partial.
      `);
    },

    /*~*/
    Success: function unsafeGet() {
      return this.value;
    }
  },


  /*~
   * type: |
   *   forall a, b: (Validation a b).(b) => b
   */
  getOrElse: {
    /*~*/
    Failure: function getOrElse(_default) {
      return _default;
    },

    /*~*/
    Success: function getOrElse(_default) {
      return this.value;
    }
  },


  /*~
   * type: |
   *   forall a, b, c:
   *     (Validation a b).((a) => Validation c b) => Validation c b
   */
  orElse: {
    /*~*/
    Failure: function orElse(handler) {
      assertFunction('Validation.Failure#orElse', handler);
      return handler(this.value);
    },

    /*~*/
    Success: function orElse(handler) {
      assertFunction('Validation.Success#orElse', handler);
      return this;
    }
  },


  /*~
   * type: |
   *   forall a, b:
   *     (Validation a b).(Validation a b) => Validation a b
   *   where a is Semigroup
   */
  concat: {
    /*~*/
    Failure: function concat(aValidation) {
      assertValidation('Validation.Failure#concat', aValidation);
      if (Failure.hasInstance(aValidation)) {
        return Failure(this.value.concat(aValidation.value));
      } else {
        return this;
      }
    },

    /*~*/
    Success: function concat(aValidation) {
      assertValidation('Validation.Success#concat', aValidation);
      return aValidation;
    }
  },


  /*~
   * type: |
   *   forall a, b, c:
   *     (Validation a b).((a) => c, (b) => c) => c
   */
  fold: {
    /*~*/
    Failure: function fold(failureTransformation, successTransformation) {
      assertFunction('Validation.Failure#fold', failureTransformation);
      assertFunction('Validation.Failure#fold', successTransformation);
      return failureTransformation(this.value);
    },

    /*~*/
    Success: function fold(failureTransformation, successTransformation) {
      assertFunction('Validation.Success#fold', failureTransformation);
      assertFunction('Validation.Success#fold', successTransformation);
      return successTransformation(this.value);
    }
  },


  /*~
   * type: |
   *   forall a, b: (Validation a b).() => Validation b a
   */
  swap: {
    /*~*/
    Failure: function swap() {
      return Success(this.value);
    },

    /*~*/
    Success: function swap() {
      return Failure(this.value);
    }
  },


  /*~
   * type: |
   *   forall a, b, c, d:
   *     (Validation a b).((a) => c, (b) => d) => Validation c d
   */
  bimap: {
    /*~*/
    Failure: function bimap(failureTransformation, successTransformation) {
      assertFunction('Validation.Failure#fold', failureTransformation);
      assertFunction('Validation.Failure#fold', successTransformation);
      return Failure(failureTransformation(this.value));
    },

    /*~*/
    Success: function bimap(failureTransformation, successTransformation) {
      assertFunction('Validation.Success#fold', failureTransformation);
      assertFunction('Validation.Success#fold', successTransformation);
      return Success(successTransformation(this.value));
    }
  },


  /*~
   * type: |
   *   forall a, b, c:
   *     (Validation a b).((a) => c) Validation c b
   */
  mapFailure: {
    /*~*/
    Failure: function mapFailure(transformation) {
      assertFunction('Validation.Failure#mapFailure', transformation);
      return Failure(transformation(this.value));
    },

    /*~*/
    Success: function mapFailure(transformation) {
      assertFunction('Validation.Failure#mapFailure', transformation);
      return this;
    }
  }
});


Object.assign(Validation, {
  /*~
   * type: |
   *   forall a, b: (b) => Validation a b
   */
  of(value) {
    return Success(value);
  },

  /*~
   * type: |
   *   forall a, b: (Validation a b).() => b :: throws TypeError
   */
  'get'() {
    warnDeprecation('`.get()` is deprecated, and has been renamed to `.unsafeGet()`.');
    return this.unsafeGet();
  },

  /*~
   * type: |
   *   forall a, b: (Validation a b).() => a or b
   */
  merge() {
    return this.value;
  },

  /*~
   * type: |
   *   forall a, b: (Validation a b).() => Result a b
   */
  toResult() {
    return require('folktale/conversions/validation-to-result')(this);
  },

  /*~
   * type: |
   *   forall a, b: (Validation a b).() => Maybe b
   */
  toMaybe() {
    return require('folktale/conversions/validation-to-maybe')(this);
  }
});


provideAliases(Success.prototype);
provideAliases(Failure.prototype);
provideAliases(Validation);

module.exports = Validation;
